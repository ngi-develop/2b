import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getToken, setToken, setUnauthorizedHandler } from '../api/http.js'
import * as api from '../api/dashboard.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))
  const [vocabulary, setVocabulary] = useState(null)

  const signOut = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  /* A rejected token means the session is over, wherever the call came from. */
  useEffect(() => {
    setUnauthorizedHandler(() => signOut())
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  /* Restore a session from a stored token on first load. */
  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    let alive = true
    api
      .me()
      .then((res) => {
        if (alive) setUser(res.user)
      })
      .catch(() => setToken(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  /* Labels come from the server so the dashboard and the API never disagree
     about what a status is called. */
  useEffect(() => {
    if (!user || vocabulary) return
    api.getVocabulary().then(setVocabulary).catch(() => {})
  }, [user, vocabulary])

  const signIn = useCallback(async (email, password) => {
    const res = await api.login(email, password)
    setToken(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      signOut,
      vocabulary,
      isAdmin: user?.role === 'admin',
      isManager: user?.role === 'admin' || user?.role === 'manager',
    }),
    [user, loading, signIn, signOut, vocabulary]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Resolves a slug to its French label, falling back to the slug itself. */
export function useLabels() {
  const { vocabulary } = useAuth()
  return useCallback(
    (group, key) => vocabulary?.[group]?.[key] ?? key ?? '—',
    [vocabulary]
  )
}
