import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'

const navy = '#174e59'
const teal = '#319ea9'
const border = 'rgba(49,158,169,.2)'
const textPrimary = '#10252b'
const textSecondary = '#4f6870'
const offWhite = '#f3f8f9'

const ROLE_LABEL: Record<string, string> = {
  asesor: 'Asesor',
  admin: 'Administrator',
  juri: 'Juri',
  peserta: 'Peserta',
}

interface Props {
  onClose: () => void
}

export function ProfileModal({ onClose }: Props) {
  const user = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)
  const qc = useQueryClient()

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const avatarSrc = user?.id ? `/api/users/${user.id}/avatar` : null

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const res = await api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      updateUser(res.data.data)
      qc.invalidateQueries({ queryKey: ['comments'] })
    } catch {
      setError('Avatar upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await api.patch('/users/me', { name: name.trim(), phone: phone.trim() || null })
      updateUser(res.data.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Update failed.')
    } finally {
      setSaving(false)
    }
  }

  const initials = user?.name
    ? user.name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(10,25,30,.45)', zIndex: 1000 }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 1001, width: 380, background: '#fff', borderRadius: 18,
        boxShadow: '0 24px 60px rgba(10,25,30,.28)', overflow: 'hidden',
        fontFamily: 'Inter,Helvetica,Arial,sans-serif',
      }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg,#143f49,#227b86 62%,${teal})`, padding: '28px 24px 80px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>My Profile</div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, marginTop: 2 }}>
                {ROLE_LABEL[user?.role ?? ''] ?? user?.role}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', fontSize: 16, width: 30, height: 30, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
              ×
            </button>
          </div>
        </div>

        {/* Avatar — overlaps header */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: -52 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 96, height: 96, borderRadius: '50%', border: '4px solid #fff',
              background: `linear-gradient(135deg,${navy},${teal})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', boxShadow: '0 4px 16px rgba(10,25,30,.2)',
            }}>
              {avatarSrc ? (
                <img
                  src={`${avatarSrc}?t=${Date.now()}`}
                  alt={user?.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : null}
              <span style={{
                position: avatarSrc ? 'absolute' : 'static',
                fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: 1,
                opacity: avatarSrc ? 0 : 1,
              }}>
                {initials}
              </span>
            </div>

            {/* Upload button */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 28, height: 28, borderRadius: '50%',
                background: teal, border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 13,
              }}
              title="Change photo"
            >
              {uploading ? '⌛' : '📷'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 24px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: textPrimary }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>{user?.email}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5 }}>
                Full Name
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, background: offWhite, color: textPrimary, fontFamily: 'inherit', boxSizing: 'border-box' as const }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: 'uppercase', letterSpacing: '.6px', display: 'block', marginBottom: 5 }}>
                Phone
              </label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. +62 812 0000 0000"
                style={{ width: '100%', padding: '9px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, background: offWhite, color: textPrimary, fontFamily: 'inherit', boxSizing: 'border-box' as const }}
              />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#e84040', background: '#fef1f1', padding: '6px 10px', borderRadius: 6 }}>{error}</div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{
              marginTop: 16, width: '100%', padding: '11px', borderRadius: 10, border: 'none',
              background: saved ? '#0d8c72' : teal, color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
              transition: 'background .2s',
            }}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  )
}
