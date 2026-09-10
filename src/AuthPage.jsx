import { useState } from 'react'
import { ArrowRight, Leaf, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { isSupabaseConfigured, signIn, signUp } from './lib/supabase'

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('farmer')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (mode === 'register' && !name.trim()) return setError('Enter your full name.')
    if (!email.trim() || !email.includes('@')) return setError('Enter a valid email address.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    const response = mode === 'login' ? await signIn(email.trim(), password) : await signUp({ name: name.trim(), email: email.trim(), password, role })
    setLoading(false)
    if (response.error) return setError(response.error.message)
    if (mode === 'register' && !response.data?.session) {
      setMessage('Registration successful. Check your email to confirm your account, then sign in.')
      setMode('login')
      setPassword('')
      return
    }
    onAuthenticated(response.data?.user || { email, user_metadata: { full_name: name, role } })
  }

  const enterDemo = () => onAuthenticated({ email: 'demo@smartprocurement.local', user_metadata: { full_name: 'Ramesh Kumar', role: 'farmer' } })

  return <main className="auth-page"><div className="auth-visual"><div className="auth-brand"><span className="brand-mark"><Leaf size={21} /></span><span><strong>Smart</strong><b>Procurement</b></span></div><div className="auth-story"><div className="eyebrow">GOVERNMENT AGRICULTURE SERVICES</div><h1>Every harvest deserves a fair, clear path to market.</h1><p>Book a centre, follow your queue, and keep every procurement record in one trusted place.</p></div><div className="auth-trust"><ShieldCheck size={17} /> Secure service for farmers and procurement teams</div></div><section className="auth-panel"><div className="auth-panel-head"><div className="mobile-auth-brand"><span className="brand-mark"><Leaf size={19} /></span><strong>Smart Procurement</strong></div><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); setMessage('') }}>Sign in</button><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); setMessage('') }}>Register</button></div></div><div className="auth-copy"><div className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'CREATE YOUR ACCOUNT'}</div><h2>{mode === 'login' ? 'Sign in to your portal' : 'Register for Smart Procurement'}</h2><p>{mode === 'login' ? 'Use your account details to continue.' : 'Set up your account and choose the portal you work with.'}</p></div><form className="auth-form" onSubmit={submit}>{mode === 'register' && <label><span>Full name</span><div className="auth-input"><UserRound size={17} /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your full name" autoComplete="name" /></div></label>}<label><span>Email address</span><div className="auth-input"><Mail size={17} /><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete="email" /></div></label><label><span>Password</span><div className="auth-input"><LockKeyhole size={17} /><input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 characters" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div></label>{mode === 'register' && <label><span>Portal</span><select value={role} onChange={(event) => setRole(event.target.value)}><option value="farmer">Farmer</option><option value="operator">Centre operator</option><option value="inspector">Quality inspector</option></select></label>}{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-message" role="status">{message}</p>}<button className="primary-btn auth-submit" disabled={loading}>{loading ? <><LoaderCircle size={17} className="spin" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</> : <>{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></>}</button></form>{!isSupabaseConfigured && <button className="demo-entry" onClick={enterDemo}>Continue in demo mode</button>}<p className="auth-footer"><ShieldCheck size={14} /> Your account details are protected by Supabase authentication.</p></section></main>
}
