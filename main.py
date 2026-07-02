from dotenv import load_dotenv
import os
from groq import Groq
import json

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def parse_job_description(jd_text: str) -> dict:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """Extract from this job description and return ONLY valid JSON:
                {
                    "role": "job title",
                    "company": "company name",
                    "skills_required": ["skill1", "skill2"],
                    "experience": "X years",
                    "deadline": "date or Not mentioned",
                    "location": "location or Remote"
                }"""
            },
            {"role": "user", "content": jd_text}
        ]
    )
    text = response.choices[0].message.content
    # Clean JSON
    text = text.strip().replace("```json", "").replace("```", "")
    return json.loads(text)

def match_resume(jd_data: dict, resume_text: str) -> str:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """You are a career advisor. Compare the job requirements 
                with the candidate resume and provide:
                1. Match Score (0-100%)
                2. Matching Skills
                3. Missing Skills  
                4. Resume improvements needed
                Be specific and actionable."""
            },
            {
                "role": "user",
                "content": f"Job Requirements:\n{json.dumps(jd_data, indent=2)}\n\nResume:\n{resume_text}"
            }
        ]
    )
    return response.choices[0].message.content

def draft_recruiter_message(jd_data: dict, candidate_name: str) -> str:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "Write a professional, personalized recruiter outreach message. Keep it under 150 words. Sound human, not templated."
            },
            {
                "role": "user",
                "content": f"Candidate: {candidate_name}\nApplying for: {jd_data.get('role')} at {jd_data.get('company')}\nKey skills: {', '.join(jd_data.get('skills_required', []))}"
            }
        ]
    )
    return response.choices[0].message.content

def generate_interview_prep(jd_data: dict) -> str:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "Generate 5 likely interview questions with ideal answer frameworks for this role. Be specific to the role and company."
            },
            {
                "role": "user",
                "content": f"Role: {jd_data.get('role')} at {jd_data.get('company')}\nRequired skills: {', '.join(jd_data.get('skills_required', []))}"
            }
        ]
    )
    return response.choices[0].message.content

if __name__ == "__main__":
    print("✅ All functions loaded successfully")