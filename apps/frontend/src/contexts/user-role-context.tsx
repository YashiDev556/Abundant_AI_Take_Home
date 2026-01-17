"use client"

/**
 * User Role Context
 * Manages user role switching between creator and reviewer modes
 * Note: This is a UI-only context for demo purposes
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type UserRole = 'creator' | 'reviewer'

interface UserRoleContextType {
  role: UserRole
  setRole: (role: UserRole) => void
  isReviewer: boolean
  isCreator: boolean
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined)

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('creator')

  // Load role from localStorage on mount
  useEffect(() => {
    const savedRole = localStorage.getItem('userRole') as UserRole
    if (savedRole === 'creator' || savedRole === 'reviewer') {
      setRoleState(savedRole)
    }
  }, [])

  // Save role to localStorage and apply CSS class
  const setRole = (newRole: UserRole) => {
    setRoleState(newRole)
    localStorage.setItem('userRole', newRole)
  }

  // Apply reviewer-mode class to document
  useEffect(() => {
    if (role === 'reviewer') {
      document.documentElement.classList.add('reviewer-mode')
    } else {
      document.documentElement.classList.remove('reviewer-mode')
    }
  }, [role])

  return (
    <UserRoleContext.Provider
      value={{
        role,
        setRole,
        isReviewer: role === 'reviewer',
        isCreator: role === 'creator',
      }}
    >
      {children}
    </UserRoleContext.Provider>
  )
}

export function useUserRole() {
  const context = useContext(UserRoleContext)
  if (context === undefined) {
    throw new Error('useUserRole must be used within a UserRoleProvider')
  }
  return context
}
