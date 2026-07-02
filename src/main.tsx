import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthGuard, useCurrentUser, useRecordList, useRecordCreate } from 'lemma-sdk/react'
import { lemmaClient } from './lemma-client'
import './styles.css'

const queryClient = new QueryClient()

interface Application {
  id: string
  company_name: string
  role_title: string
  status: string
  skills: string
  match_score: string
  recruiter_message: string
  interview_prep: string
  priority: string
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

async function callGroq(systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 1000,
    })
  })
  const data = await res.json()
  return data.choices[0].message.content
}

async function parseJD(jd: string) {
  const result = await callGroq(
    `Extract from this job description and return ONLY valid JSON with these keys:
    {"role":"","company":"","skills":[""],"experience":"","deadline":"","location":""}`,
    jd
  )
  try {
    const clean = result.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { role: 'Unknown', company: 'Unknown', skills: [], experience: 'N/A', deadline: 'N/A', location: 'N/A' }
  }
}

async function matchResume(jdData: Record<string, unknown>, resume: string): Promise<string> {
  return callGroq(
    `You are a career advisor. Compare job requirements with the resume.
    Return:
    1. Match Score (0-100%)
    2. Matching Skills
    3. Missing Skills
    4. Top 2 resume improvements
    Be concise and specific.`,
    `Job: ${JSON.stringify(jdData)}\n\nResume:\n${resume}`
  )
}

async function draftMessage(jdData: Record<string, unknown>, name: string): Promise<string> {
  return callGroq(
    `Write a professional recruiter outreach message under 120 words. Sound human, not templated.`,
    `Candidate: ${name}\nRole: ${jdData.role} at ${jdData.company}\nSkills: ${Array.isArray(jdData.skills) ? jdData.skills.join(', ') : ''}`
  )
}

async function generateInterviewPrep(jdData: Record<string, unknown>): Promise<string> {
  return callGroq(
    `Generate 5 likely interview questions with brief answer frameworks. Be specific to the role.`,
    `Role: ${jdData.role} at ${jdData.company}\nSkills: ${Array.isArray(jdData.skills) ? jdData.skills.join(', ') : ''}`
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Applied': '#3b82f6',
    'Interview': '#8b5cf6',
    'Offer': '#10b981',
    'Rejected': '#ef4444',
    'Pending': '#f59e0b',
  }
  return (
    <span style={{
      background: colors[status] ?? '#6b7280',
      color: 'white',
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 600,
    }}>
      {status}
    </span>
  )
}

function App() {
  const { user } = useCurrentUser({ client: lemmaClient })
  const [view, setView] = useState<'list' | 'add' | 'detail'>('list')
  const [jd, setJd] = useState('')
  const [resume, setResume] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [selected, setSelected] = useState<Application | null>(null)
  const [activeTab, setActiveTab] = useState<'match' | 'message' | 'prep'>('match')

  const recordsQuery = useRecordList(lemmaClient, lemmaClient.podId, 'job_applications')
  const createRecord = useRecordCreate(lemmaClient, lemmaClient.podId)

  const applications = ((recordsQuery.data as unknown as { items?: Application[] })?.items ?? [])

  const handleAnalyze = async () => {
    if (!jd.trim() || !resume.trim()) return
    setLoading(true)

    try {
      setLoadingStep('Parsing job description...')
      const jdData = await parseJD(jd)

      setLoadingStep('Matching against your resume...')
      const matchResult = await matchResume(jdData, resume)

      setLoadingStep('Drafting recruiter message...')
      const message = await draftMessage(jdData, user?.email ?? 'Candidate')

      setLoadingStep('Generating interview prep...')
      const prep = await generateInterviewPrep(jdData)

      setLoadingStep('Saving to your pod...')
      await createRecord.mutateAsync({
  tableName: 'job_applications',
  payload: {
    company_name: jdData.company ?? 'Unknown',
    role_title: jdData.role ?? 'Unknown',
    status: 'applied',
    skills: Array.isArray(jdData.skills) ? jdData.skills.join(', ') : '',
    match_score: matchResult,
    recruiter_message: message,
    interview_prep: prep,
    priority: 'medium',
  }
})

      setView('list')
      setJd('')
      setResume('')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', color: '#e2e2f0', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{ background: '#13132e', borderBottom: '1px solid #1e1e4a', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6c63ff, #4f46e5)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="5" r="2" fill="white"/>
              <circle cx="4" cy="13" r="2" fill="white" opacity="0.7"/>
              <circle cx="14" cy="13" r="2" fill="white" opacity="0.7"/>
              <line x1="9" y1="7" x2="5" y2="12" stroke="white" strokeWidth="1" opacity="0.6"/>
              <line x1="9" y1="7" x2="13" y2="12" stroke="white" strokeWidth="1" opacity="0.6"/>
              <line x1="5" y1="13" x2="13" y2="13" stroke="white" strokeWidth="1" opacity="0.4"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e2f0' }}>JobPilot AI</div>
            <div style={{ fontSize: 11, color: '#6b6b9a' }}>powered by Lemma</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#a0a0c0' }}>{user?.email}</span>
          <button
            onClick={() => { setView('add'); setSelected(null) }}
            style={{ background: 'linear-gradient(135deg, #6c63ff, #4f46e5)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
          >
            + Add Application
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        {view === 'list' && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#e2e2f0', margin: 0 }}>Your Applications</h1>
              <p style={{ color: '#6b6b9a', marginTop: 4 }}>{applications.length} tracked · AI-powered insights for each</p>
            </div>

            {recordsQuery.isLoading && <p style={{ color: '#6b6b9a' }}>Loading applications...</p>}

            {applications.length === 0 && !recordsQuery.isLoading && (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#13132e', borderRadius: 16, border: '1px solid #1e1e4a' }}>
                <div style={{ width: 56, height: 56, background: 'rgba(108,99,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h2 style={{ color: '#e2e2f0', marginBottom: 8 }}>No applications yet</h2>
                <p style={{ color: '#6b6b9a', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>Paste a job description and your resume to get AI-powered match scores, recruiter messages, and interview prep.</p>
                <button
                  onClick={() => setView('add')}
                  style={{ background: 'linear-gradient(135deg, #6c63ff, #4f46e5)', color: 'white', border: 'none', borderRadius: 8, padding: '12px 24px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Track Your First Application
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {applications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => { setSelected(app); setView('detail'); setActiveTab('match') }}
                  style={{ background: '#13132e', border: '1px solid #1e1e4a', borderRadius: 12, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#6c63ff')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e4a')}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#e2e2f0' }}>{app.role_title}</div>
                    <div style={{ color: '#a0a0c0', fontSize: 14, marginTop: 2 }}>{app.company_name}</div>
                    {app.skills && <div style={{ color: '#6b6b9a', fontSize: 12, marginTop: 4 }}>{app.skills.slice(0, 60)}{app.skills.length > 60 ? '...' : ''}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <StatusBadge status={app.status ?? 'Applied'} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'add' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <button onClick={() => setView('list')} style={{ background: '#1e1e4a', border: 'none', color: '#a0a0c0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>Back</button>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Track New Application</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', color: '#a0a0c0', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>Job Description</label>
                <textarea
                  value={jd}
                  onChange={e => setJd(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={14}
                  style={{ width: '100%', background: '#13132e', border: '1px solid #1e1e4a', borderRadius: 10, padding: 14, color: '#e2e2f0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: '#a0a0c0', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>Your Resume</label>
                <textarea
                  value={resume}
                  onChange={e => setResume(e.target.value)}
                  placeholder="Paste your resume text here..."
                  rows={14}
                  style={{ width: '100%', background: '#13132e', border: '1px solid #1e1e4a', borderRadius: 10, padding: 14, color: '#e2e2f0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            </div>

            {loading && (
              <div style={{ background: '#13132e', border: '1px solid #6c63ff', borderRadius: 10, padding: 16, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ color: '#8b85ff', fontWeight: 600, marginBottom: 4 }}>AI Analysis in Progress</div>
                <div style={{ color: '#a0a0c0', fontSize: 13 }}>{loadingStep}</div>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || !jd.trim() || !resume.trim()}
              style={{ width: '100%', background: loading ? '#2d2d5e' : 'linear-gradient(135deg, #6c63ff, #4f46e5)', color: 'white', border: 'none', borderRadius: 10, padding: '14px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15 }}
            >
              {loading ? 'Analyzing...' : 'Analyze & Track Application'}
            </button>
          </div>
        )}

        {view === 'detail' && selected && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <button onClick={() => setView('list')} style={{ background: '#1e1e4a', border: 'none', color: '#a0a0c0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>Back</button>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{selected.role_title}</h1>
                <p style={{ color: '#a0a0c0', margin: '2px 0 0', fontSize: 14 }}>{selected.company_name}</p>
              </div>
              <div style={{ marginLeft: 'auto' }}><StatusBadge status={selected.status} /></div>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#13132e', borderRadius: 10, padding: 4 }}>
              {(['match', 'message', 'prep'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, background: activeTab === tab ? 'linear-gradient(135deg, #6c63ff, #4f46e5)' : 'transparent', color: activeTab === tab ? 'white' : '#a0a0c0' }}
                >
                  {tab === 'match' ? 'Resume Match' : tab === 'message' ? 'Recruiter Message' : 'Interview Prep'}
                </button>
              ))}
            </div>

            <div style={{ background: '#13132e', border: '1px solid #1e1e4a', borderRadius: 12, padding: 24 }}>
              {activeTab === 'match' && (
                <div>
                  <h3 style={{ color: '#8b85ff', marginTop: 0 }}>Resume Match Analysis</h3>
                  <pre style={{ color: '#e2e2f0', whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{selected.match_score}</pre>
                </div>
              )}
              {activeTab === 'message' && (
                <div>
                  <h3 style={{ color: '#8b85ff', marginTop: 0 }}>Recruiter Outreach Message</h3>
                  <pre style={{ color: '#e2e2f0', whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{selected.recruiter_message}</pre>
                  <button
                    onClick={() => navigator.clipboard.writeText(selected.recruiter_message)}
                    style={{ marginTop: 16, background: '#1e1e4a', border: '1px solid #6c63ff', color: '#8b85ff', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Copy Message
                  </button>
                </div>
              )}
              {activeTab === 'prep' && (
                <div>
                  <h3 style={{ color: '#8b85ff', marginTop: 0 }}>Interview Preparation</h3>
                  <pre style={{ color: '#e2e2f0', whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{selected.interview_prep}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthGuard
        client={lemmaClient}
        loadingFallback={
          <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2e2f0' }}>
            Checking access...
          </div>
        }
      >
        <App />
      </AuthGuard>
    </QueryClientProvider>
  </React.StrictMode>,
)