import { useState } from 'react'
import { Activity, AlertTriangle, ArrowRight, BarChart3, Bell, CalendarDays, Check, CircleHelp, ClipboardCheck, Clock3, CreditCard, FileText, MapPin, PackageCheck, QrCode, Settings, ShieldCheck, Sprout, Users, Weight } from 'lucide-react'
import { isSupabaseConfigured, processWorkflow } from './lib/supabase'

const farmerPages = {
  '/crops': ['My crops', 'Crop register', 'Prepare crop details before booking your procurement visit.', Sprout, ['Active crops', '3', 'Ready for booking'], ['Crop lots', ['Crop', 'Quantity', 'Harvest', 'Readiness'], [['Paddy', '50 Q', '10 Sept 2026', 'Ready'], ['Wheat', '44 Q', '22 Sept 2026', 'Ready'], ['Maize', '30 Q', '05 Oct 2026', 'Growing']]]],
  '/booking': ['Book procurement', 'Plan your visit', 'Choose a centre, date, and time slot that works for your crop.', CalendarDays, ['Nearby centres', '4', 'Within 20 km'], ['Recommended centres', ['Centre', 'Distance', 'Capacity', 'Wait'], [['Centre A', '5.2 km', '180 Q', '1h 20m'], ['Centre D', '15.1 km', '240 Q', '45m'], ['Centre B', '9.8 km', '80 Q', '3h']]]],
  '/token': ['My tokens', 'Visit passes', 'All active tokens and their current procurement status.', QrCode, ['Active token', 'P-1025', 'Centre A'], ['Token history', ['Token', 'Centre', 'Date', 'Status'], [['P-1025', 'Centre A', '10 Sept 2026', 'Waiting'], ['P-1018', 'Centre B', '28 Aug 2026', 'Completed'], ['P-1004', 'Centre A', '14 Aug 2026', 'Completed']]]],
  '/status': ['Procurement status', 'Track your lot', 'Follow verification, weighing, quality, and payment milestones.', ClipboardCheck, ['Verification', 'Passed', '10 Sept visit'], ['Paddy · P-1025', [], []]],
  '/payments': ['Payments', 'Transparent settlement', 'Review completed procurement payments and pending settlements.', CreditCard, ['Total received', '₹1,24,500', 'This season'], ['Payment ledger', ['Reference', 'Date', 'Quantity', 'Amount'], [['PAY-1024', '28 Aug 2026', '40 Q', '₹18,600'], ['PAY-1016', '14 Aug 2026', '32 Q', '₹15,200'], ['PAY-1008', '02 Aug 2026', '28 Q', '₹13,300']]]],
  '/history': ['Procurement history', 'Your records', 'A complete view of your completed visits.', FileText, ['Total visits', '8', 'Since June 2026'], ['Completed procurements', ['Token', 'Crop', 'Quantity', 'Amount'], [['P-1018', 'Paddy', '40 Q', '₹18,600'], ['P-1016', 'Wheat', '32 Q', '₹15,200'], ['P-1004', 'Maize', '28 Q', '₹13,300']]]],
  '/notifications': ['Notifications', 'Stay informed', 'Important updates about your bookings, queue, and payments.', Bell, ['Unread', '3', 'Needs attention'], ['Recent notifications', [], []]],
}

const operatorPages = {
  '/verification': ['Farmer verification', 'Identity and arrival checks', ShieldCheck, 'Verify farmer'],
  '/weighing': ['Weighing desk', 'Record accepted quantity against each token', Weight, 'Record weight'],
  '/quality': ['Quality checks', 'Inspect grain quality before acceptance', ClipboardCheck, 'Start quality check'],
  '/procurement': ['Procurement register', 'Complete today’s accepted procurement records', PackageCheck, 'Open record'],
}

const adminPages = {
  '/centres': ['Procurement centres', 'Capacity, queue, and operating status across the network', MapPin],
  '/monitoring': ['Live monitoring', 'Watch queue pressure and service health in real time', Activity],
  '/map': ['Map view', 'Locate centres and redirect demand before capacity is reached', MapPin],
  '/analytics': ['Analytics', 'Compare throughput, wait times, and farmer access', BarChart3],
  '/alerts': ['Alerts', 'Resolve capacity and service risks before they impact farmers', AlertTriangle],
  '/reports': ['Reports', 'Generate operational and settlement reports', FileText],
  '/settings': ['System settings', 'Manage centres, users, alerts, and service policies', Settings],
}

export function FeaturePageRouter({ role, path, queue, booking, centres, farmerData, PageTitle, Stat, Section, Notification, onAction }) {
  if (path === '/help') return <HelpFeature PageTitle={PageTitle} Stat={Stat} Section={Section} onAction={onAction} />
  if (role === 'farmer') return <FarmerFeature path={path} queue={queue} booking={booking} farmerData={farmerData} PageTitle={PageTitle} Stat={Stat} Section={Section} Notification={Notification} onAction={onAction} />
  if (role === 'operator') return <OperatorFeature path={path} queue={queue} PageTitle={PageTitle} Stat={Stat} Section={Section} onAction={onAction} />
  if (role === 'inspector' && path === '/inspection') return <InspectorFormPage PageTitle={PageTitle} Stat={Stat} Section={Section} onAction={onAction} />
  if (role === 'inspector') return <InspectorFeature path={path} PageTitle={PageTitle} Stat={Stat} Section={Section} onAction={onAction} />
  return <AdminFeature path={path} centres={centres} PageTitle={PageTitle} Stat={Stat} Section={Section} onAction={onAction} />
}

function FeatureShell({ eyebrow, title, subtitle, icon: Icon, stats, children, PageTitle, Stat, Section, onAction, actionLabel = 'Open' }) {
  return <><PageTitle eyebrow={eyebrow} title={title} subtitle={subtitle} action={<button className="primary-btn" onClick={() => onAction(`${title} action started`)}><Icon size={16} /> {actionLabel}</button>} /><div className="stats-grid">{stats.map((stat) => <Stat key={stat.label} {...stat} />)}</div><div className="feature-grid">{children.map((child) => <Section key={child.title} title={child.title}>{child.content}</Section>)}</div></>
}

function FarmerFeature({ path, queue, booking, farmerData, PageTitle, Stat, Section, Notification, onAction }) {
  const page = farmerPages[path] || farmerPages['/crops']
  const [title, eyebrow, subtitle, Icon, lead, section] = page
  const rows = liveFarmerRows(path, farmerData, section[2])
  const commonStats = [{ icon: Icon, label: lead[0], value: lead[1], note: lead[2] }, { icon: Weight, label: 'Total quantity', value: '124 Q', note: 'Across all crops' }, { icon: Check, label: 'Completed visits', value: '8', note: 'Records verified' }, { icon: Clock3, label: 'Next action', value: '1', note: 'Needs attention', tone: 'amber' }]
  let content = rows.length ? <FeatureTable headers={section[1]} rows={rows} onAction={onAction} /> : path === '/status' ? <Timeline /> : path === '/notifications' ? <div className="notification-list">{(farmerData?.notifications?.length ? farmerData.notifications : [{ title: 'Token generated', message: `Your token ${booking?.token || 'P-1025'} is confirmed for Centre A.`, created_at: '10 min ago' }, { title: 'Turn approaching', message: `${queue} farmers are ahead of you in the live queue.`, created_at: 'Just now' }, { title: 'Payment successful', message: '₹18,600 credited for your last procurement.', created_at: 'Yesterday' }]).map((notification) => <Notification key={notification.id || notification.title} icon={Bell} title={notification.title} text={notification.message} time={formatDate(notification.created_at)} />)}</div> : <Checklist items={['Bring your farmer ID and token', 'Keep crop lot separated and ready', 'Arrive 15 minutes before your slot']} onAction={onAction} />
  return <FeatureShell eyebrow={eyebrow} title={title} subtitle={subtitle} icon={Icon} stats={commonStats} PageTitle={PageTitle} Stat={Stat} Section={Section} onAction={onAction} actionLabel={path === '/payments' ? 'Download statement' : 'Book a slot'}>{[{ title: section[0], content }, { title: 'Next steps', content: <Checklist items={['Keep your records updated', 'Review your latest status', 'Contact support if you need help']} onAction={onAction} /> }]}</FeatureShell>
}

function liveFarmerRows(path, data, fallback) {
  if (!data) return fallback
  if (path === '/crops' && data.crops?.length) return data.crops.map((crop) => [crop.crop_type, `${crop.quantity_q} Q`, crop.harvest_date || 'Not set', crop.preliminary_ready ? 'Ready' : 'Growing'])
  if ((path === '/token' || path === '/history') && data.bookings?.length) return data.bookings.map((item) => [item.token, item.crops?.crop_type || 'Crop', item.booking_date, item.status])
  if (path === '/payments' && data.payments?.length) return data.payments.map((payment) => [payment.procurements?.receipt_id || payment.transaction_id, formatDate(payment.created_at), `${payment.amount}`, payment.status])
  return fallback
}

function formatDate(value) { if (!value) return 'Recently'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }

async function runWorkflow(action, token, onAction, payload = {}) {
  if (!isSupabaseConfigured) return onAction(`${action} opened for ${token} (demo mode)`)
  const response = await processWorkflow(action, { token, ...payload })
  onAction(response.error ? response.error.message : response.data?.message || `${action} completed for ${token}`)
}

function OperatorFeature({ path, queue, PageTitle, Stat, Section, onAction }) {
  const page = operatorPages[path] || operatorPages['/verification']
  const [title, subtitle, Icon, actionLabel] = page
  const workflow = path === '/verification' ? 'verify' : path === '/weighing' ? 'weigh' : path === '/procurement' ? 'procure' : 'quality'
  const handleWorkflow = (action, token) => runWorkflow(workflow, token, onAction, workflow === 'weigh' ? { grossWeightQ: 52, tareWeightQ: 2 } : workflow === 'procure' ? { pricePerQ: 2300 } : {})
    return <FeatureShell eyebrow="Centre A operations" title={title} subtitle={subtitle} icon={Icon} actionLabel={actionLabel} stats={[{ icon: Activity, label: 'Queue waiting', value: queue, note: 'Live now', tone: 'amber' }, { icon: Check, label: 'Completed today', value: '82', note: '46% of bookings' }, { icon: Clock3, label: 'Average service', value: '14 min', note: 'Per farmer' }, { icon: ShieldCheck, label: 'Equipment', value: 'Online', note: 'All stations ready' }]} PageTitle={PageTitle} Stat={Stat} Section={Section} onAction={onAction}>{[{ title: 'Today’s worklist', content: <FeatureTable headers={['Token', 'Farmer', 'Crop', 'Quantity', 'Status']} rows={[["P-1020", 'Ramesh Kumar', 'Paddy', '50 Q', 'Waiting'], ['P-1021', 'Suresh Das', 'Paddy', '30 Q', 'Verified'], ['P-1022', 'Amit Kumar', 'Wheat', '40 Q', 'Waiting'], ['P-1023', 'Rajesh Singh', 'Maize', '25 Q', 'In progress']]} onAction={onAction} onRowAction={handleWorkflow} actionLabel={actionLabel} /> }, { title: 'Station checklist', content: <Checklist items={['Confirm farmer identity and token', 'Capture measured quantity', 'Record quality result before acceptance']} onAction={onAction} /> }]}</FeatureShell>
}

function InspectorFormPage({ PageTitle, Stat, Section, onAction }) {
  const [token, setToken] = useState('P-1020')
  const [moisture, setMoisture] = useState('12')
  const [foreignMatter, setForeignMatter] = useState('1')
  const [result, setResult] = useState('pass')
  const [saving, setSaving] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    await runWorkflow('quality', token, onAction, { moisture: Number(moisture), foreignMatter: Number(foreignMatter), result })
    setSaving(false)
  }
  return <FeatureShell eyebrow="Quality control desk" title="Inspection workspace" subtitle="Record the quality decision for an arriving procurement lot." icon={ClipboardCheck} actionLabel="Inspection form" stats={[{ icon: ClipboardCheck, label: 'Pending', value: '12', note: 'Needs attention', tone: 'amber' }, { icon: Check, label: 'Completed today', value: '48', note: '↑ 8% vs yesterday' }, { icon: PackageCheck, label: 'Passed', value: '43', note: '89.6% acceptance' }, { icon: AlertTriangle, label: 'Not approved', value: '5', note: 'Review reasons' }]} PageTitle={PageTitle} Stat={Stat} Section={Section} onAction={onAction}>{[{ title: 'Quality inspection', content: <form className="feature-form" onSubmit={submit}><label>Booking token<input value={token} onChange={(event) => setToken(event.target.value.toUpperCase())} required /></label><label>Moisture percentage<input type="number" min="0" step="0.1" value={moisture} onChange={(event) => setMoisture(event.target.value)} required /></label><label>Foreign matter percentage<input type="number" min="0" step="0.1" value={foreignMatter} onChange={(event) => setForeignMatter(event.target.value)} required /></label><label>Quality decision<select value={result} onChange={(event) => setResult(event.target.value)}><option value="pass">Pass</option><option value="not_approved">Not approved</option></select></label><button className="primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Save inspection'} <Check size={16} /></button></form> }, { title: 'Quality standards', content: <Checklist items={['Moisture within crop limit', 'No visible foreign matter', 'Photograph and notes attached']} onAction={onAction} /> }]}</FeatureShell>
}

function InspectorFeature({ path, PageTitle, Stat, Section, onAction }) {
  const inspection = path !== '/history'
  return <FeatureShell eyebrow="Quality control desk" title={inspection ? (path === '/inspection' ? 'Inspection workspace' : 'Pending inspections') : 'Inspection history'} subtitle={inspection ? 'Record moisture, cleanliness, and acceptance for each arriving lot.' : 'Review decisions and quality records from completed inspections.'} icon={ClipboardCheck} actionLabel={inspection ? 'Save inspection' : 'Export records'} stats={[{ icon: ClipboardCheck, label: 'Pending', value: '12', note: 'Needs attention', tone: 'amber' }, { icon: Check, label: 'Completed today', value: '48', note: '↑ 8% vs yesterday' }, { icon: PackageCheck, label: 'Passed', value: '43', note: '89.6% acceptance' }, { icon: AlertTriangle, label: 'Not approved', value: '5', note: 'Review reasons' }]} PageTitle={PageTitle} Stat={Stat} Section={Section} onAction={onAction}>{[{ title: inspection ? 'Inspection queue' : 'Recent decisions', content: <FeatureTable headers={['Token', 'Farmer', 'Crop', 'Quantity']} rows={[["P-1020", 'Ramesh Kumar', 'Paddy', '50 Q'], ['P-1022', 'Amit Kumar', 'Wheat', '40 Q'], ['P-1023', 'Rajesh Singh', 'Maize', '25 Q']]} onAction={onAction} actionLabel={inspection ? 'Inspect' : 'View result'} /> }, { title: 'Quality standards', content: <Checklist items={['Moisture within crop limit', 'No visible foreign matter', 'Photograph and notes attached']} onAction={onAction} /> }]}</FeatureShell>
}

function AdminFeature({ path, centres, PageTitle, Stat, Section, onAction }) {
  const [title, subtitle, Icon] = adminPages[path] || adminPages['/centres']
  const rows = centres.map((centre) => [centre.name, centre.status, `${centre.waiting}`, `${centre.capacity}%`])
  return <FeatureShell eyebrow="National procurement network" title={title} subtitle={subtitle} icon={Icon} actionLabel={path === '/reports' ? 'Generate report' : 'Export'} stats={[{ icon: MapPin, label: 'Active centres', value: '24', note: 'Across 8 districts' }, { icon: Users, label: 'Farmers online', value: '12,450', note: '↑ 4.8% this month' }, { icon: PackageCheck, label: 'Processed today', value: '7,620 Q', note: '77.6% completion' }, { icon: AlertTriangle, label: 'Open alerts', value: '3', note: 'Needs review', tone: 'amber' }]} PageTitle={PageTitle} Stat={Stat} Section={Section} onAction={onAction}>{[{ title: path === '/alerts' ? 'Open alerts' : 'Network overview', content: path === '/alerts' ? <Checklist items={['Centre C at 95% capacity', 'Centre B wait time above target', 'Payment batch pending approval']} onAction={onAction} /> : <FeatureTable headers={['Centre', 'Status', 'Waiting', 'Capacity']} rows={rows} onAction={onAction} actionLabel={path === '/settings' ? 'Manage' : 'Open'} /> }, { title: path === '/analytics' ? 'Throughput trend' : 'Recommended action', content: <div className="chart-bars wide">{[44, 62, 54, 78, 69, 88, 74].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div> }]}</FeatureShell>
}

function HelpFeature({ PageTitle, Stat, Section, onAction }) {
  return <FeatureShell eyebrow="Support" title="Help centre" subtitle="Quick answers and support for every step of your procurement journey." icon={CircleHelp} actionLabel="Contact support" stats={[{ icon: CircleHelp, label: 'Guides', value: '12', note: 'Available offline' }, { icon: Bell, label: 'Service status', value: 'Normal', note: 'All systems online' }, { icon: Users, label: 'Support hours', value: '6 AM–8 PM', note: 'Every day' }, { icon: ShieldCheck, label: 'Language', value: 'English', note: 'Change in settings' }]} PageTitle={PageTitle} Stat={Stat} Section={Section} onAction={onAction}>{[{ title: 'Common questions', content: <Checklist items={['How do I book a procurement slot?', 'Where can I find my token?', 'When will my payment be credited?']} onAction={onAction} /> }, { title: 'Need more help?', content: <Checklist items={['Call farmer support: 1800-123-4567', 'Email: support@smartprocurement.gov.in', 'Response time: within one working day']} onAction={onAction} /> }]}</FeatureShell>
}

function FeatureTable({ headers, rows, onAction, onRowAction, actionLabel = 'Open' }) {
  return <div className="table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}<th /></tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={`${row[0]}-${index}`}>{index === 0 ? <strong>{cell}</strong> : cell}</td>)}<td><button className="row-action" onClick={() => onRowAction ? onRowAction(actionLabel, row[0]) : onAction(`${actionLabel}: ${row[0]}`)}>{actionLabel}</button></td></tr>)}</tbody></table></div>
}

function Checklist({ items, onAction }) { return <div className="checklist">{items.map((item) => <button key={item} onClick={() => onAction(`${item} confirmed`)}><span><Check size={14} /></span>{item}<ArrowRight size={15} /></button>)}</div> }
function Timeline() { return <div className="timeline">{['Booking confirmed', 'Farmer verification', 'Weighing and quality check', 'Payment credited'].map((step, index) => <div className={index < 2 ? 'done' : ''} key={step}><span>{index < 2 ? <Check size={13} /> : index + 1}</span><strong>{step}</strong><small>{index < 2 ? 'Completed' : 'Pending'}</small></div>)}</div> }
