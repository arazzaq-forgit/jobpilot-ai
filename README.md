# JobPilot AI — Job Application Command Centre

> Built for Gappy AI National Hackathon 2026 | Powered by Lemma SDK + Groq AI

## Problem
Students and job seekers apply to dozens of jobs across portals, 
emails, and LinkedIn — with no system to track applications, 
analyze fit, or prepare for interviews.

## Solution
An AI-powered command centre that:
- **Parses** any job description instantly
- **Matches** it against your resume with gap analysis  
- **Drafts** personalized recruiter outreach messages
- **Preps** you for interviews with role-specific questions
- **Tracks** all applications saved to Lemma pod datastore

## Live Demo
https://job-pilot.apps.lemma.work

## Tech Stack
- **Lemma SDK** — Pod datastore, auth, deployment on lemma.work
- **Groq AI** — LLaMA 3.3 70B for all AI inference
- **React + TypeScript** — Frontend UI
- **Vite** — Build tooling

## Core Loop
Paste JD + Resume → AI Analysis → Match Score + Recruiter Message + Interview Prep → Saved to Lemma

## Setup
```bash
npm install
npm run dev
```

Add to `.env.local`:
VITE_LEMMA_API_URL=https://api.lemma.work
VITE_LEMMA_AUTH_URL=https://lemma.work/auth
VITE_LEMMA_POD_ID=your_pod_id
VITE_GROQ_API_KEY=your_groq_key

## Built By
Mohammed Abdul Razzaq | Lords Institute of Engineering & Technology  
Gappy AI National Hackathon 2026