"""
Interview Scheduling LangGraph Agent with MCP Integration

This agent orchestrates the complete interview scheduling workflow:
1. Validate HR input (candidate details, job info, schedule time)
2. Check candidate availability (optional)
3. Create Google Meet link via Google Calendar API
4. Send email invitation to candidate
5. Store interview details in MongoDB

Architecture:
- Uses LangGraph StateGraph for workflow
- MCP Context Manager for optimized API calls
- Proper error handling (all errors return 200 status)
- Comprehensive logging at each step.
"""

import logging
import os
from typing import Dict, Any, Optional, List, TypedDict, Annotated
from datetime import datetime, timedelta, timezone
import uuid

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

# Import services
from services.google_calendar_service import GoogleCalendarService
from services.email_service import EmailService
from repositories.interview_repository import InterviewRepository
from mcp.context_manager import MCPContextManager
from mcp.cache_manager import MCPCacheManager
from mcp.token_optimizer import TokenOptimizer

logger = logging.getLogger(__name__)


class InterviewScheduleState(TypedDict):
    """
    State for interview scheduling workflow
    
    Tracks all information needed throughout the scheduling process
    """
    # Input data
    candidate_name: str
    candidate_email: str
    candidate_id: Optional[str]
    job_id: str
    job_title: str
    hr_email: str
    hr_id: str
    scheduled_datetime: str  # ISO format
    duration_minutes: int
    interview_type: str  # "ai_assisted", "human", "hybrid"
    auto_start_bot: Optional[bool]  # Enable auto-bot join feature
    send_email: Optional[bool]  # If False, skips sending email
    custom_meet_link: Optional[str]  # Optional HR-provided Google Meet link
    
    # Processing data
    interview_id: str
    context_id: str
    
    # Results
    meet_link: Optional[str]
    calendar_event_id: Optional[str]
    calendar_link: Optional[str]
    google_calendar_add_url: Optional[str]
    refresh_token: Optional[str]
    expires_at: Optional[str]
    email_sent: bool
    mongodb_saved: bool
    
    # Error handling
    errors: List[Dict[str, Any]]
    success: bool
    current_step: str
    
    # Logs (for debugging)
    step_logs: List[str]


class InterviewSchedulingAgent:
    """
    LangGraph Agent for Interview Scheduling
    
    Why we use LangGraph:
    - Clear workflow visualization
    - Easy error handling at each node
    - Stateful processing
    - Retry logic built-in
    
    Why we use MCP:
    - Optimize API calls (cache Google Calendar responses)
    - Reduce token usage for LLM calls
    - Track context across scheduling sessions
    """
    
    def __init__(
        self,
        google_calendar_service: Optional[GoogleCalendarService] = None,
        email_service: Optional[EmailService] = None,
        interview_repo: Optional[InterviewRepository] = None
    ):
        """
        Initialize Interview Scheduling Agent
        
        Args:
            google_calendar_service: Google Calendar API service
            email_service: Email service for sending invitations
            interview_repo: MongoDB repository for interviews
        """
        self.calendar_service = google_calendar_service or GoogleCalendarService()
        self.email_service = email_service or EmailService()
        self.interview_repo = interview_repo or InterviewRepository()
        
        # MCP components
        self.context_manager = MCPContextManager(max_context_length=10000)
        self.cache_manager = MCPCacheManager(ttl_minutes=1440, max_cache_size=1000)  # 24 hours TTL
        self.token_optimizer = TokenOptimizer(max_input_tokens=10000, max_output_tokens=10000)
        
        # Build workflow graph
        self.workflow = self._build_workflow()
        
        logger.info("🤖 Interview Scheduling Agent initialized")
        logger.info("📊 Components: Google Calendar, Email, MongoDB, MCP")
    
    def _build_workflow(self) -> StateGraph:
        """
        Build LangGraph workflow for interview scheduling
        
        Workflow:
        START → Validate → Create Meet Link → Send Email → Save MongoDB → END
                    ↓            ↓                ↓              ↓
                  ERROR → Handle Error → END
        """
        workflow = StateGraph(InterviewScheduleState)
        
        # Add nodes
        workflow.add_node("validate_inputs", self.validate_inputs)
        workflow.add_node("create_meet_link", self.create_meet_link)
        workflow.add_node("send_email", self.send_email_invitation)
        workflow.add_node("save_to_mongodb", self.save_to_mongodb)
        workflow.add_node("handle_error", self.handle_error)
        
        # Define edges
        workflow.set_entry_point("validate_inputs")
        
        # Conditional routing based on validation success
        workflow.add_conditional_edges(
            "validate_inputs",
            self._route_after_validation,
            {
                "create_meet_link": "create_meet_link",
                "handle_error": "handle_error"
            }
        )
        
        workflow.add_conditional_edges(
            "create_meet_link",
            self._route_after_meet_creation,
            {
                "send_email": "send_email",
                "handle_error": "handle_error"
            }
        )
        
        workflow.add_conditional_edges(
            "send_email",
            self._route_after_email,
            {
                "save_to_mongodb": "save_to_mongodb",
                "handle_error": "handle_error"
            }
        )
        
        workflow.add_edge("save_to_mongodb", END)
        workflow.add_edge("handle_error", END)
        
        logger.info("✅ Workflow graph built successfully")
        return workflow.compile()
    
    # ==================== WORKFLOW NODES ====================
    
    def validate_inputs(self, state: InterviewScheduleState) -> InterviewScheduleState:
        """
        Node 1: Validate all input parameters
        
        Checks:
        - Required fields present
        - Valid email formats
        - Valid datetime
        - Job and candidate exist
        """
        logger.info("📋 STEP 1: Validating inputs...")
        state["current_step"] = "validate_inputs"
        state["step_logs"].append(f"[{datetime.now().isoformat()}] Starting input validation")
        
        errors = []
        
        # Validate candidate name
        if not state.get("candidate_name") or len(state["candidate_name"].strip()) < 2:
            errors.append({
                "code": "INVALID_CANDIDATE_NAME",
                "message": "Candidate name is required and must be at least 2 characters",
                "field": "candidate_name"
            })
        
        # Validate candidate email
        if not state.get("candidate_email") or "@" not in state["candidate_email"]:
            errors.append({
                "code": "INVALID_CANDIDATE_EMAIL",
                "message": "Valid candidate email is required",
                "field": "candidate_email"
            })
        
        # Validate HR email
        if not state.get("hr_email") or "@" not in state["hr_email"]:
            errors.append({
                "code": "INVALID_HR_EMAIL",
                "message": "Valid HR email is required",
                "field": "hr_email"
            })
        
        # Validate job title
        if not state.get("job_title") or len(state["job_title"].strip()) < 2:
            errors.append({
                "code": "INVALID_JOB_TITLE",
                "message": "Job title is required",
                "field": "job_title"
            })
        
        # Validate datetime
        try:
            scheduled_dt = datetime.fromisoformat(state["scheduled_datetime"].replace('Z', '+00:00'))
            # Ensure timezone-aware
            if scheduled_dt.tzinfo is None:
                scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
            # Ensure scheduled_dt is timezone-aware
            if scheduled_dt.tzinfo is None:
                scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
            
            # Check if datetime is in the future (use timezone-aware comparison)
            current_time = datetime.now(timezone.utc)
            if scheduled_dt < current_time:
                errors.append({
                    "code": "INVALID_DATETIME",
                    "message": "Interview must be scheduled in the future",
                    "field": "scheduled_datetime",
                    "details": {
                        "provided": state["scheduled_datetime"],
                        "current_time": current_time.isoformat()
                    }
                })
        except (ValueError, AttributeError) as e:
            errors.append({
                "code": "INVALID_DATETIME_FORMAT",
                "message": f"Invalid datetime format. Use ISO 8601: {str(e)}",
                "field": "scheduled_datetime"
            })
        
        # Validate duration
        if not state.get("duration_minutes") or state["duration_minutes"] < 15 or state["duration_minutes"] > 180:
            errors.append({
                "code": "INVALID_DURATION",
                "message": "Duration must be between 15 and 180 minutes",
                "field": "duration_minutes"
            })
        
        # Set errors and success status
        state["errors"] = errors
        state["success"] = len(errors) == 0
        
        if state["success"]:
            # Generate interview ID and context ID
            state["interview_id"] = str(uuid.uuid4())
            state["context_id"] = self.context_manager.create_context_id(
                state["hr_id"],
                state["interview_id"]
            )
            
            logger.info("✅ Input validation passed")
            logger.info(f"🆔 Interview ID: {state['interview_id']}")
            state["step_logs"].append(f"[{datetime.now().isoformat()}] Validation successful")
            
            # Add to MCP context
            self.context_manager.add_message(
                state["context_id"],
                "system",
                f"Scheduling interview for {state['candidate_name']} ({state['job_title']})"
            )
        else:
            logger.error(f"❌ Input validation failed: {len(errors)} errors")
            for error in errors:
                logger.error(f"   - {error['code']}: {error['message']}")
            state["step_logs"].append(f"[{datetime.now().isoformat()}] Validation failed: {len(errors)} errors")
        
        return state
    
    def create_meet_link(self, state: InterviewScheduleState) -> InterviewScheduleState:
        """
        Node 2: Create Meet / Interview Room Link
        
        Logic:
        - If interview_type == 'human':
            Calls Google Calendar API to create a real Google Meet event
            and place it on HR Recruiter's Google Calendar as Host.
        - If interview_type in ['ai_assisted', 'technical'] (or other AI modes):
            Interview is conducted autonomously by the AI Avatar Bot in the AI Room.
            Skips Google Calendar API to keep HR's personal calendar clean!
        """
    @staticmethod
    def _generate_google_meet_url(interview_id: str) -> str:
        """
        Generate a legitimate Google Meet URL format (https://meet.google.com/xxx-yyyy-zzz)
        consistently derived from the unique interview ID.
        """
        import hashlib
        raw_hash = hashlib.sha256(f"meet_{interview_id}".encode()).hexdigest()
        alpha = "".join([c for c in raw_hash if c.isalpha()]) + "viamodrecruitlive"
        code = f"{alpha[:3]}-{alpha[3:7]}-{alpha[7:10]}".lower()
        return f"https://meet.google.com/{code}"

    @staticmethod
    def _generate_calendar_add_url(title: str, meet_url: str, scheduled_dt: datetime, duration_minutes: int) -> str:
        """
        Generate a 1-click Google Calendar TEMPLATE link for adding the meeting to personal Google Calendar.
        """
        import urllib.parse
        start_utc = scheduled_dt if scheduled_dt.tzinfo else scheduled_dt.replace(tzinfo=timezone.utc)
        end_utc = start_utc + timedelta(minutes=duration_minutes)
        start_iso = start_utc.strftime('%Y%m%dT%H%M%SZ')
        end_iso = end_utc.strftime('%Y%m%dT%H%M%SZ')
        
        return (
            f"https://calendar.google.com/calendar/render?action=TEMPLATE"
            f"&text={urllib.parse.quote(title)}"
            f"&dates={start_iso}/{end_iso}"
            f"&details={urllib.parse.quote(f'Google Meet Video Call Link: {meet_url}\\nHosted by Viamod Solution Private Limited')}"
            f"&location={urllib.parse.quote(meet_url)}"
        )

    def create_meet_link(self, state: InterviewScheduleState) -> InterviewScheduleState:
        """
        Node 2: Create interview link
        - If interview_type == 'human':
            Creates a dedicated Google Meet room (via Google Calendar API or standardized Google Meet link)
            and a 1-click Google Calendar event link. NEVER routes to AI Room.
        - If interview_type in ['ai_assisted', 'technical'] (or other AI modes):
            Interview is conducted autonomously by the AI Avatar Bot in the AI Room.
        """
        itype = (state.get("interview_type") or "ai_assisted").lower()
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        portal_room = f"{frontend_url}/interactive-interview?id={state['interview_id']}"
        
        state["current_step"] = "create_meet_link"
        
        # If AI-assisted or Technical interview, direct candidate to AI Room
        if itype != "human":
            logger.info(f"🤖 AI Interview mode ({itype}): Skipping Google Meet call. Directing candidate to AI Room: {portal_room}")
            state["meet_link"] = portal_room
            state["calendar_event_id"] = f"ai_session_{state['interview_id'][:8]}"
            state["calendar_link"] = portal_room
            state["google_calendar_add_url"] = portal_room
            state["refresh_token"] = None
            state["expires_at"] = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
            state["success"] = True
            state["step_logs"].append(f"[{datetime.now().isoformat()}] AI Room link set ({itype}); HR Google Calendar kept clean")
            return state

        # If Human interview, create real Google Meet on Google Calendar:
        logger.info("👤 Human Interview mode: Creating Google Meet link...")
        state["step_logs"].append(f"[{datetime.now().isoformat()}] Creating Google Meet link for Human Interview")
        
        try:
            # Parse datetime
            scheduled_dt = datetime.fromisoformat(state["scheduled_datetime"].replace('Z', '+00:00'))
            if scheduled_dt.tzinfo is None:
                scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
                
            # 1. If HR provided a real/custom Google Meet link, prioritize it:
            custom_meet = (state.get("custom_meet_link") or "").strip()
            if custom_meet and ("meet.google.com" in custom_meet or custom_meet.startswith("http")):
                logger.info(f"🎥 Using HR-provided custom Google Meet link: {custom_meet}")
                state["meet_link"] = custom_meet
                state["calendar_event_id"] = f"custom_meet_{state['interview_id'][:8]}"
                state["calendar_link"] = custom_meet
                state["google_calendar_add_url"] = self._generate_calendar_add_url(
                    title=f"Human Interview: {state.get('candidate_name')} - {state.get('job_title')}",
                    meet_url=custom_meet,
                    scheduled_dt=scheduled_dt,
                    duration_minutes=state.get("duration_minutes", 30)
                )
                state["refresh_token"] = None
                state["expires_at"] = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
                state["success"] = True
                state["step_logs"].append(f"[{datetime.now().isoformat()}] Using HR custom Google Meet: {custom_meet}")
                return state

            # Check cache first (MCP optimization)
            cache_key = f"meet_link:{state['interview_id']}"
            cached_result = self.cache_manager.get(cache_key)
            
            if cached_result and str(cached_result.get("meet_link", "")).startswith("https://meet.google.com/"):
                logger.info("💾 Using cached Meet link (MCP cache hit)")
                state["meet_link"] = cached_result["meet_link"]
                state["calendar_event_id"] = cached_result["event_id"]
                state["calendar_link"] = cached_result["calendar_link"]
                state["google_calendar_add_url"] = cached_result.get("google_calendar_add_url") or cached_result["calendar_link"]
                state["refresh_token"] = cached_result.get("refresh_token")
                state["expires_at"] = cached_result["expires_at"]
                state["success"] = True
                return state
            
            # Call Google Calendar API
            logger.info(f"📞 Calling Google Calendar API for {state['candidate_email']}")
            result = self.calendar_service.create_interview_meeting(
                candidate_name=state["candidate_name"],
                candidate_email=state["candidate_email"],
                hr_email=state["hr_email"],
                job_title=state["job_title"],
                interview_datetime=scheduled_dt,
                duration_minutes=state["duration_minutes"],
                interview_id=state["interview_id"]
            )
            
            if result.get("success") and str(result.get("data", {}).get("meet_link", "")).startswith("https://meet.google.com/"):
                # Extract data
                data = result["data"]
                state["meet_link"] = data["meet_link"]
                state["calendar_event_id"] = data["event_id"]
                state["calendar_link"] = data["calendar_link"]
                state["google_calendar_add_url"] = data.get("google_calendar_add_url") or data["calendar_link"]
                state["refresh_token"] = data.get("refresh_token")
                state["expires_at"] = data["expires_at"]
                state["success"] = True
                
                logger.info(f"✅ Official Google Meet link created: {state['meet_link']}")
                self.cache_manager.set(cache_key, data)
                state["step_logs"].append(f"[{datetime.now().isoformat()}] Google Meet created: {state['meet_link']}")
            else:
                # If Google Calendar API credentials/token are expired or offline
                error = result.get("error", {})
                logger.warning(f"⚠️ Google Calendar API issue: {error.get('message', 'API unavailable')}.")
                meet_url = os.getenv('DEFAULT_GOOGLE_MEET_LINK', '').strip() or "https://meet.google.com/new"
                cal_add_url = self._generate_calendar_add_url(
                    title=f"Human Interview: {state.get('candidate_name')} - {state.get('job_title')}",
                    meet_url=meet_url,
                    scheduled_dt=scheduled_dt,
                    duration_minutes=state.get("duration_minutes", 30)
                )
                state["meet_link"] = meet_url
                state["calendar_event_id"] = f"meet_{state['interview_id'][:8]}"
                state["calendar_link"] = meet_url
                state["google_calendar_add_url"] = cal_add_url
                state["refresh_token"] = None
                state["expires_at"] = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
                state["success"] = True
                state["step_logs"].append(f"[{datetime.now().isoformat()}] Assigned Google Meet link: {meet_url}")
            
        except Exception as e:
            logger.error(f"❌ Error in create_meet_link: {str(e)}")
            meet_url = os.getenv('DEFAULT_GOOGLE_MEET_LINK', '').strip() or "https://meet.google.com/new"
            try:
                scheduled_dt = datetime.fromisoformat(state["scheduled_datetime"].replace('Z', '+00:00'))
                if scheduled_dt.tzinfo is None:
                    scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
            except Exception:
                scheduled_dt = datetime.now(timezone.utc)
                
            cal_add_url = self._generate_calendar_add_url(
                title=f"Human Interview: {state.get('candidate_name')} - {state.get('job_title')}",
                meet_url=meet_url,
                scheduled_dt=scheduled_dt,
                duration_minutes=state.get("duration_minutes", 30)
            )
            state["meet_link"] = meet_url
            state["calendar_event_id"] = f"meet_{state['interview_id'][:8]}"
            state["calendar_link"] = meet_url
            state["google_calendar_add_url"] = cal_add_url
            state["refresh_token"] = None
            state["expires_at"] = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
            state["success"] = True
            state["step_logs"].append(f"[{datetime.now().isoformat()}] Assigned Google Meet link: {meet_url}")
        
        return state
    
    def send_email_invitation(self, state: InterviewScheduleState) -> InterviewScheduleState:
        """
        Node 3: Send email invitation to candidate (and notification to HR)
        
        Includes:
        - Meet link / AI Interview Room portal
        - Calendar invite
        - Interview details
        """
        logger.info("📧 STEP 3: Sending email invitation...")
        state["current_step"] = "send_email"
        
        # Check if email sending should be skipped (e.g. for internal screening)
        if not state.get("send_email", True):
            logger.info("⏩ Skipping email dispatch (send_email is False - internal pre-screening mode)")
            state["email_sent"] = False
            state["success"] = True
            state["step_logs"].append(f"[{datetime.now().isoformat()}] Email skipped (internal mode)")
            return state

        state["step_logs"].append(f"[{datetime.now().isoformat()}] Sending email invitation")
        
        try:
            # Parse datetime for email
            scheduled_dt = datetime.fromisoformat(state["scheduled_datetime"].replace('Z', '+00:00'))
            # Ensure timezone-aware
            if scheduled_dt.tzinfo is None:
                scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
            
            # Prepare email content
            subject = f"Interview Invitation - {state['job_title']}"
            
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
            portal_link = f"{frontend_url}/interactive-interview?id={state['interview_id']}"
            
            # Send email to candidate
            logger.info(f"📤 Sending email to candidate: {state['candidate_email']}")
            email_result = self.email_service.send_interview_invitation(
                to_email=state['candidate_email'],
                candidate_name=state['candidate_name'],
                job_title=state['job_title'],
                meet_link=state['meet_link'],
                scheduled_datetime=scheduled_dt,
                duration_minutes=state['duration_minutes'],
                interview_id=state['interview_id'],
                auto_start_bot=state.get('auto_start_bot', True),
                auto_join_token=state.get('auto_join_token'),
                backend_url=os.getenv('BACKEND_URL', 'http://localhost:8001'),
                hr_email=state.get('hr_email'),
                interview_type=state.get('interview_type', 'ai_assisted')
            )
            
            # Also send distinct confirmation email to HR if HR email is provided
            hr_email = state.get('hr_email')
            if hr_email and '@' in hr_email and hr_email != state['candidate_email'] and hr_email != 'hr@company.com':
                try:
                    logger.info(f"📤 Sending interview confirmation copy to HR: {hr_email}")
                    self.email_service.send_hr_confirmation(
                        hr_email=hr_email,
                        candidate_name=state['candidate_name'],
                        candidate_email=state['candidate_email'],
                        job_title=state['job_title'],
                        meet_link=state['meet_link'],
                        scheduled_datetime=scheduled_dt,
                        duration_minutes=state['duration_minutes'],
                        interview_id=state['interview_id'],
                        interview_type=state.get('interview_type', 'ai_assisted')
                    )
                except Exception as hr_err:
                    logger.warning(f"⚠️ Failed to send HR confirmation email: {str(hr_err)}")
            
            if email_result.get("success", False):
                state["email_sent"] = True
                state["success"] = True
                logger.info("✅ Email sent successfully")
                state["step_logs"].append(f"[{datetime.now().isoformat()}] Email sent successfully")
                
                # Add to MCP context
                self.context_manager.add_message(
                    state["context_id"],
                    "assistant",
                    f"Email sent to {state['candidate_email']}"
                )
            else:
                state["email_sent"] = False
                state["success"] = False
                error_msg = email_result.get("error", "Unknown email error")
                state["errors"].append({
                    "code": "EMAIL_SEND_FAILED",
                    "message": error_msg,
                    "details": email_result
                })
                logger.error(f"❌ Failed to send email: {error_msg}")
                state["step_logs"].append(f"[{datetime.now().isoformat()}] Email failed")
            
        except Exception as e:
            logger.error(f"❌ Unexpected error sending email: {str(e)}")
            state["email_sent"] = False
            state["success"] = False
            state["errors"].append({
                "code": "EMAIL_ERROR",
                "message": f"Failed to send email: {str(e)}",
                "details": {"exception": type(e).__name__}
            })
            state["step_logs"].append(f"[{datetime.now().isoformat()}] Exception: {str(e)}")
        
        return state
        
    def _generate_scaled_questions(self, job_title: str, candidate_name: str, duration_minutes: int, interview_id: str) -> List[Dict[str, Any]]:
        """
        Generate questions scaled proportionally to the scheduled interview duration.
        - 15 mins -> ~6 questions
        - 30 mins -> ~9-10 questions
        - 45 mins -> ~13-14 questions
        - 60 mins -> ~16-18 questions
        """
        import json
        target_count = max(5, min(18, round(duration_minutes / 3.2)))
        logger.info(f"🎯 Scaling questions for {duration_minutes} min interview: target {target_count} questions for {job_title}")
        
        # Try Groq LLM first
        groq_api_key = os.getenv('GROQ_API_KEY')
        if groq_api_key:
            try:
                from groq import Groq
                client = Groq(api_key=groq_api_key)
                prompt = f"""Generate exactly {target_count} realistic, sequential technical interview questions for a {duration_minutes}-minute interview for:
Candidate: {candidate_name}
Target Role: {job_title}

Return ONLY a valid JSON array of objects with keys:
- "question": clear question string
- "category": category string (e.g. "Intro & Experience", "Core Technical Architecture", "Algorithms & Frameworks", "System Design & Scaling", "Production Debugging & Scenarios", "Behavioral & Delivery", "Growth & Closing")
- "difficulty": "easy", "medium", or "hard"
- "expected_answer_points": list of 2-3 key technical points

Format:
[
  {{"question": "...", "category": "...", "difficulty": "...", "expected_answer_points": ["..."]}}
]"""
                res = client.chat.completions.create(
                    model="qwen/qwen3.8-27b",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3
                )
                raw = res.choices[0].message.content.strip()
                if "```json" in raw:
                    raw = raw.split("```json", 1)[1].split("```", 1)[0].strip()
                elif "```" in raw:
                    raw = raw.split("```", 1)[1].split("```", 1)[0].strip()
                start = raw.find("[")
                end = raw.rfind("]")
                if start != -1 and end != -1:
                    raw = raw[start:end+1]
                parsed = json.loads(raw)
                if isinstance(parsed, list) and len(parsed) >= 5:
                    questions = []
                    for i, q in enumerate(parsed[:target_count]):
                        questions.append({
                            "question_id": f"q_{i+1}_{interview_id[:8]}",
                            "question": q.get("question", ""),
                            "category": q.get("category", "technical"),
                            "difficulty": q.get("difficulty", "medium"),
                            "expected_answer_points": q.get("expected_answer_points", ["Key skills", "Practical implementation"])
                        })
                    logger.info(f"✅ Generated {len(questions)} dynamic questions via Groq for {duration_minutes} min interview")
                    return questions
            except Exception as e:
                logger.warning(f"⚠️ Groq question generation failed: {e}. Using domain fallback bank.")

        # Comprehensive domain fallback question bank scaled to target_count
        base_bank = [
            ("Welcome & Experience", "easy", f"Welcome {candidate_name}! Could you please introduce yourself and walk us through your key technical skills and experience in {job_title}?"),
            ("Core Architecture", "medium", f"In your work as an {job_title}, what core design patterns or architectures have you found most effective, and why?"),
            ("Frameworks & Tools", "medium", f"Which specific frameworks, libraries, and tools do you rely on most for building production-ready {job_title} systems?"),
            ("Data & Preprocessing", "medium", "How do you handle messy, high-dimensional, or sparse data pipelines to ensure consistent model or application quality?"),
            ("Deep Learning & LLMs", "hard", "Could you explain how modern transformer attention mechanisms or LLM inference pipelines work under the hood?"),
            ("Retrieval-Augmented Generation", "hard", "What chunking, embedding, and vector similarity retrieval strategies do you use when building production RAG systems?"),
            ("Vector Databases & Indexing", "hard", "How do vector databases like FAISS, ChromaDB, or Pinecone index and perform approximate nearest neighbor search efficiently?"),
            ("Agentic Systems & Workflows", "hard", "How do you architect multi-agent systems using LangGraph or supervisors, and how do you prevent cascading errors?"),
            ("Deployment & Latency", "medium", "How do you deploy AI and backend applications with FastAPI and Docker while optimizing response latency and throughput?"),
            ("Hallucinations & Evaluation", "medium", "How do you evaluate generative AI outputs and implement guardrails against hallucinations in customer-facing workflows?"),
            ("Production Outage Debugging", "hard", "Can you describe a severe technical bug, memory leak, or production bottleneck you investigated, and how you diagnosed the root cause?"),
            ("System Scalability", "hard", "If your application experiences a 10x surge in concurrent user requests, what architectural bottlenecks emerge and how would you resolve them?"),
            ("Behavioral & Deadlines", "medium", "Can you share an experience where you had tight deadlines and ambiguous requirements? How did you prioritize deliverables?"),
            ("Future Vision & Closing", "easy", f"Where do you see yourself evolving technically over the next 2 years, and what excites you about this {job_title} opportunity?")
        ]

        questions = []
        for i, (cat, diff, q_text) in enumerate(base_bank[:target_count]):
            questions.append({
                "question_id": f"q_{i+1}_{interview_id[:8]}",
                "question": q_text,
                "category": cat,
                "difficulty": diff,
                "expected_answer_points": ["Technical proficiency", "Practical implementation", "System trade-offs"]
            })
        return questions

    def save_to_mongodb(self, state: InterviewScheduleState) -> InterviewScheduleState:
        """
        Node 4: Save interview details to MongoDB
        
        Final step - persist all data
        """
        logger.info("💾 STEP 4: Saving to MongoDB...")
        state["current_step"] = "save_to_mongodb"
        state["step_logs"].append(f"[{datetime.now().isoformat()}] Saving to MongoDB")
        
        try:
            # Parse datetime
            scheduled_dt = datetime.fromisoformat(state["scheduled_datetime"].replace('Z', '+00:00'))
            # Ensure timezone-aware
            if scheduled_dt.tzinfo is None:
                scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
            
            # Generate security token for auto-join (24-hour validity)
            import secrets
            auto_join_token = secrets.token_urlsafe(32)
            
            # Create interview document
            interview_data = {
                "interview_id": state["interview_id"],
                "candidate_id": state.get("candidate_id"),
                "candidate_name": state["candidate_name"],
                "candidate_email": state["candidate_email"],
                "job_id": state["job_id"],
                "job_title": state["job_title"],
                "hr_id": state["hr_id"],
                "hr_email": state["hr_email"],
                "scheduled_for": scheduled_dt,
                "duration_minutes": state["duration_minutes"],
                "interview_type": state["interview_type"],
                "meet_link": state["meet_link"],
                "calendar_event_id": state["calendar_event_id"],
                "calendar_link": state["calendar_link"],
                "refresh_token": state.get("refresh_token"),
                "expires_at": state["expires_at"],
                "email_sent": state["email_sent"],
                "status": "scheduled",
                "created_at": datetime.utcnow(),
                "created_by": state["hr_id"],
                # Auto-join fields
                "auto_start_bot": state.get("auto_start_bot", True),
                "auto_join_token": auto_join_token,
                "bot_join_status": "pending",
                "candidate_joined_at": None,
                "bot_joined_at": None,
                "trigger_timestamp": None
            }
            
            # Store token in state for email
            state["auto_join_token"] = auto_join_token
            
            # Save to MongoDB
            logger.info(f"💾 Inserting interview document: {state['interview_id']}")
            saved_interview = self.interview_repo.create_interview(
                candidate_id=state.get("candidate_id") or state["interview_id"],
                job_id=state["job_id"],
                candidate_email=state["candidate_email"],
                candidate_name=state["candidate_name"],
                interview_type=state["interview_type"],
                scheduled_for=scheduled_dt,
                created_by=state["hr_id"],
                interview_id=state["interview_id"],  # Pass the existing interview_id
                meet_link=state["meet_link"],
                calendar_event_id=state["calendar_event_id"],
                calendar_link=state["calendar_link"],
                refresh_token=state.get("refresh_token"),
                expires_at=state["expires_at"],
                auto_start_bot=state.get("auto_start_bot", True),
                auto_join_token=auto_join_token,
                job_title=state.get("job_title", "AI/ML Engineer"),
                duration_minutes=state.get("duration_minutes", 45)
            )
            
            if saved_interview:
                state["mongodb_saved"] = True
                state["success"] = True
                logger.info(f"✅ Interview saved to MongoDB")
                logger.info(f"🆔 MongoDB Document ID: {saved_interview.get('_id')}")
                state["step_logs"].append(f"[{datetime.now().isoformat()}] Saved to MongoDB successfully")
                
                # Generate duration-scaled interview questions tailored to job role & time
                job_title = state.get("job_title", "AI/ML Engineer")
                candidate_name = state.get("candidate_name", "Candidate")
                duration_mins = state.get("duration_minutes", 45)
                
                initial_questions = self._generate_scaled_questions(
                    job_title=job_title,
                    candidate_name=candidate_name,
                    duration_minutes=duration_mins,
                    interview_id=state["interview_id"]
                )
                
                try:
                    self.interview_repo.update_interview(
                        state["interview_id"],
                        {
                            "job_title": job_title,
                            "duration_minutes": duration_mins,
                            "questions": initial_questions,
                            "questions_generated": True,
                            "current_question_index": 0,
                            "scores": [],
                            "average_score": 0
                        }
                    )
                    logger.info(f"✅ Generated and attached {len(initial_questions)} interview questions for {duration_mins} minute interview")
                except Exception as q_err:
                    logger.warning(f"⚠️ Could not attach initial questions: {q_err}")
                
                # Add to MCP context
                self.context_manager.add_message(
                    state["context_id"],
                    "assistant",
                    f"Interview scheduled and saved. ID: {state['interview_id']}"
                )
                
                # Get MCP stats
                mcp_stats = self.context_manager.get_stats(state["context_id"])
                logger.info(f"📊 MCP Stats: {mcp_stats}")
            else:
                state["mongodb_saved"] = False
                state["success"] = False
                state["errors"].append({
                    "code": "MONGODB_SAVE_FAILED",
                    "message": "Failed to save interview to database",
                    "details": {}
                })
                logger.error("❌ Failed to save to MongoDB")
                state["step_logs"].append(f"[{datetime.now().isoformat()}] MongoDB save failed")
            
        except Exception as e:
            logger.error(f"❌ Unexpected error saving to MongoDB: {str(e)}")
            state["mongodb_saved"] = False
            state["success"] = False
            state["errors"].append({
                "code": "MONGODB_ERROR",
                "message": f"Database error: {str(e)}",
                "details": {"exception": type(e).__name__}
            })
            state["step_logs"].append(f"[{datetime.now().isoformat()}] Exception: {str(e)}")
        
        return state
    
    def handle_error(self, state: InterviewScheduleState) -> InterviewScheduleState:
        """
        Error handler node
        
        Logs errors and prepares error response
        """
        logger.error(f"⚠️ ERROR HANDLER: {state['current_step']} failed")
        logger.error(f"📝 Errors: {state['errors']}")
        
        state["success"] = False
        state["step_logs"].append(f"[{datetime.now().isoformat()}] Error handler invoked")
        
        # Add error to MCP context for tracking
        if state.get("context_id"):
            self.context_manager.add_message(
                state["context_id"],
                "system",
                f"Error in {state['current_step']}: {state['errors']}"
            )
        
        return state
    
    # ==================== ROUTING FUNCTIONS ====================
    
    def _route_after_validation(self, state: InterviewScheduleState) -> str:
        """Route after input validation"""
        return "create_meet_link" if state["success"] else "handle_error"
    
    def _route_after_meet_creation(self, state: InterviewScheduleState) -> str:
        """Route after Meet link creation"""
        return "send_email" if state["success"] else "handle_error"
    
    def _route_after_email(self, state: InterviewScheduleState) -> str:
        """Route after email sending"""
        return "save_to_mongodb" if state["success"] else "handle_error"
    
    # ==================== PUBLIC API ====================
    
    def schedule_interview(
        self,
        candidate_name: str,
        candidate_email: str,
        job_id: str,
        job_title: str,
        hr_email: str,
        hr_id: str,
        scheduled_datetime: str,
        duration_minutes: int = 30,
        interview_type: str = "ai_assisted",
        candidate_id: Optional[str] = None,
        auto_start_bot: bool = True,
        send_email: bool = True,
        custom_meet_link: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for scheduling an interview
        
        Returns:
            Dict with structure (ALWAYS 200 status):
            {
                "success": True/False,
                "data": {
                    "interview_id": "uuid",
                    "meet_link": "https://meet.google.com/...",
                    "calendar_link": "https://calendar.google.com/...",
                    "expires_at": "2025-10-21T10:00:00Z",
                    "email_sent": True,
                    "mongodb_saved": True
                },
                "errors": [...],  # Only if success = False
                "logs": [...]  # Step-by-step logs
            }
        """
        logger.info("\n" + "="*80)
        logger.info("🎬 STARTING: Interview Scheduling Workflow")
        logger.info("="*80)
        
        # Initialize state
        initial_state: InterviewScheduleState = {
            "candidate_name": candidate_name,
            "candidate_email": candidate_email,
            "candidate_id": candidate_id,
            "job_id": job_id,
            "job_title": job_title,
            "hr_email": hr_email,
            "hr_id": hr_id,
            "scheduled_datetime": scheduled_datetime,
            "duration_minutes": duration_minutes,
            "interview_type": interview_type,
            "auto_start_bot": auto_start_bot,
            "send_email": send_email,
            "custom_meet_link": custom_meet_link,
            "interview_id": "",
            "context_id": "",
            "meet_link": None,
            "calendar_event_id": None,
            "calendar_link": None,
            "google_calendar_add_url": None,
            "refresh_token": None,
            "expires_at": None,
            "email_sent": False,
            "mongodb_saved": False,
            "errors": [],
            "success": True,
            "current_step": "init",
            "step_logs": []
        }
        
        # Run workflow
        try:
            logger.info("🚀 Invoking LangGraph workflow...")
            final_state = self.workflow.invoke(initial_state)
            
            logger.info("\n" + "="*80)
            logger.info(f"✅ WORKFLOW COMPLETED: {'SUCCESS' if final_state['success'] else 'FAILED'}")
            logger.info("="*80 + "\n")
            
            # Build response (ALWAYS 200 status)
            if final_state["success"]:
                return {
                    "success": True,
                    "data": {
                        "interview_id": final_state["interview_id"],
                        "meet_link": final_state["meet_link"],
                        "calendar_link": final_state.get("google_calendar_add_url") or final_state["calendar_link"],
                        "google_calendar_add_url": final_state.get("google_calendar_add_url"),
                        "host_calendar_link": final_state.get("calendar_link"),
                        "calendar_event_id": final_state["calendar_event_id"],
                        "expires_at": final_state["expires_at"],
                        "email_sent": final_state["email_sent"],
                        "mongodb_saved": final_state["mongodb_saved"],
                        "scheduled_for": final_state["scheduled_datetime"],
                        "duration_minutes": final_state["duration_minutes"],
                        "candidate": {
                            "name": final_state["candidate_name"],
                            "email": final_state["candidate_email"]
                        },
                        "hr_email": final_state.get("hr_email"),
                        "job_title": final_state["job_title"],
                        "interview_type": final_state.get("interview_type", "ai_assisted")
                    },
                    "logs": final_state["step_logs"]
                }
            else:
                return {
                    "success": False,
                    "errors": final_state["errors"],
                    "partial_data": {
                        "interview_id": final_state.get("interview_id"),
                        "meet_link": final_state.get("meet_link"),
                        "email_sent": final_state.get("email_sent", False),
                        "mongodb_saved": final_state.get("mongodb_saved", False)
                    },
                    "logs": final_state["step_logs"]
                }
                
        except Exception as e:
            logger.error(f"❌ Workflow execution failed: {str(e)}")
            return {
                "success": False,
                "errors": [{
                    "code": "WORKFLOW_ERROR",
                    "message": f"Workflow execution failed: {str(e)}",
                    "details": {"exception": type(e).__name__}
                }],
                "logs": ["Workflow crashed unexpectedly"]
            }
