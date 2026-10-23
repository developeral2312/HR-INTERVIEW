##
import os
from dotenv import load_dotenv
load_dotenv('backend/.env')
from pymongo import MongoClient

mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
db_name = os.getenv('MONGODB_DB_NAME', 'ai_recruiter')
client = MongoClient(mongo_uri)
db = client[db_name]

base_questions = [
    {'question_id': 'q_1_b1d38fb6', 'category': 'Intro & Experience', 'difficulty': 'easy', 'question': 'Welcome ADITYA VERM! Could you please introduce yourself and walk us through your key technical skills and experience in AI/ML Engineering?'},
    {'question_id': 'q_2_b1d38fb6', 'category': 'Core Architecture', 'difficulty': 'medium', 'question': 'In your work as an AI/ML Engineer, what core design patterns or model architectures have you found most effective, and why?'},
    {'question_id': 'q_3_b1d38fb6', 'category': 'Frameworks & Tooling', 'difficulty': 'medium', 'question': 'Which specific deep learning and AI frameworks (e.g. PyTorch, Hugging Face, LangChain, LangGraph) do you rely on for production systems?'},
    {'question_id': 'q_4_b1d38fb6', 'category': 'Data Engineering', 'difficulty': 'medium', 'question': 'How do you handle dirty, high-dimensional, or sparse feature datasets to ensure high model accuracy and prevent data leakage?'},
    {'question_id': 'q_5_b1d38fb6', 'category': 'Deep Learning & Transformers', 'difficulty': 'hard', 'question': 'Could you explain how modern Transformer multi-head self-attention mechanisms work under the hood and how they scale?'},
    {'question_id': 'q_6_b1d38fb6', 'category': 'RAG & Vector Retrieval', 'difficulty': 'hard', 'question': 'What chunking strategies, embedding models, and vector similarity retrieval techniques do you use when building enterprise RAG systems?'},
    {'question_id': 'q_7_b1d38fb6', 'category': 'Vector Databases', 'difficulty': 'hard', 'question': 'How do vector databases like FAISS, ChromaDB, or Pinecone index embeddings to perform approximate nearest neighbor (ANN) search at low latency?'},
    {'question_id': 'q_8_b1d38fb6', 'category': 'Agentic AI & Orchestration', 'difficulty': 'hard', 'question': 'How do you architect multi-agent systems using LangGraph or state supervisors, and how do you prevent cascading hallucinations or loops?'},
    {'question_id': 'q_9_b1d38fb6', 'category': 'Deployment & Latency', 'difficulty': 'medium', 'question': 'How do you deploy AI models and backend APIs with FastAPI and Docker while optimizing response latency and GPU/CPU resource utilization?'},
    {'question_id': 'q_10_b1d38fb6', 'category': 'LLM Evaluation & Guardrails', 'difficulty': 'medium', 'question': 'How do you evaluate generative AI outputs and implement strict guardrails against hallucinations in customer-facing enterprise applications?'},
    {'question_id': 'q_11_b1d38fb6', 'category': 'Production Outage Debugging', 'difficulty': 'hard', 'question': 'Can you describe a severe technical bug, memory leak, or CUDA out-of-memory error you diagnosed in production, and how you fixed it?'},
    {'question_id': 'q_12_b1d38fb6', 'category': 'System Scalability', 'difficulty': 'hard', 'question': 'If your application experiences a 10x surge in concurrent requests during a peak load event, what architectural bottlenecks emerge and how would you scale?'},
    {'question_id': 'q_13_b1d38fb6', 'category': 'Behavioral & Delivery', 'difficulty': 'medium', 'question': 'Can you share an experience where you had tight deadlines and ambiguous requirements? How did you prioritize deliverables and ensure success?'},
    {'question_id': 'q_14_b1d38fb6', 'category': 'Career Vision & Closing', 'difficulty': 'easy', 'question': 'Where do you see yourself evolving technically over the next 2-3 years, and what excites you most about this AI/ML Engineer position?'}
]

res = db.interviews.update_one(
    {'interview_id': 'b1d38fb6-7485-46c6-839f-1887e24c2a01'},
    {'$set': {
        'duration_minutes': 45,
        'job_title': 'AI / ML Engineer',
        'questions': base_questions,
        'status': 'scheduled',
        'current_question_index': 0
    }}
)

print(f"Matched: {res.matched_count}, Modified: {res.modified_count}")

inv = db.interviews.find_one({'interview_id': 'b1d38fb6-7485-46c6-839f-1887e24c2a01'})
print(f"Verified questions count: {len(inv.get('questions', []))}")
print(f"Verified duration: {inv.get('duration_minutes')} minutes")
