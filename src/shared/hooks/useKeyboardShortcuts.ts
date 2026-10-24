import { useEffect, useState, useCallback, useMemo, RefObject } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Role } from '../../constants/roles'

export interface ShortcutItem {
  key: string
  label: string
  path: string
  description: string
}

interface UseKeyboardShortcutsOptions {
  searchInputRef?: RefObject<HTMLInputElement | null>
}

export function useKeyboardShortcuts(options?: UseKeyboardShortcutsOptions) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  // Determine navigable items based on current role
  const navItems = useMemo<ShortcutItem[]>(() => {
    if (user?.role === Role.TECHNICIAN) {
      return [
        { key: '1', label: 'My Materials', path: '/my-materials', description: 'Technician assigned inventory' }
      ]
    }

    if (user?.role === Role.STORE_KEEPER) {
      return [
        { key: '1', label: 'Dashboard', path: '/', description: 'Overview and quick metrics' },
        { key: '2', label: 'Products', path: '/products', description: 'Product catalog and stock' },
        { key: '3', label: 'Issue Materials', path: '/issue', description: 'Issue items to technicians' },
        { key: '4', label: 'Return Materials', path: '/returns', description: 'Process returned materials' },
        { key: '5', label: 'Purchase Orders', path: '/purchases', description: 'Purchase orders and restocking' },
        { key: '6', label: 'Transaction Log', path: '/transaction-log', description: 'Full history of material movements' },
      ]
    }

    // Default for Admin, Owner, SuperAdmin, Supervisor
    return [
      { key: '1', label: 'Dashboard', path: '/', description: 'Overview and quick metrics' },
      { key: '2', label: 'Products', path: '/products', description: 'Product catalog and inventory levels' },
      { key: '3', label: 'Issue Materials', path: '/issue', description: 'Issue materials to staff' },
      { key: '4', label: 'Return Materials', path: '/returns', description: 'Return issued materials to store' },
      { key: '5', label: 'Purchase Orders', path: '/purchases', description: 'Purchase orders and supplier requests' },
      { key: '6', label: 'Employees', path: '/employees', description: 'Staff, technicians, and supervisor team' },
      { key: '7', label: 'Transaction Log', path: '/transaction-log', description: 'Full history of material movements' },
    ]
  }, [user?.role])

  const isTyping = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false
    const tagName = target.tagName.toLowerCase()
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true
    if (target.isContentEditable || target.closest('[contenteditable="true"]')) return true
    return false
  }, [])

  const isModalOpen = useCallback((): boolean => {
    return !!document.querySelector('[role="dialog"]')
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const typing = isTyping(e.target)

      // 1. Search Bar shortcut: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        options?.searchInputRef?.current?.focus()
        return
      }

      // 2. Escape: if search input is focused, blur it
      if (e.key === 'Escape') {
        if (options?.searchInputRef?.current && document.activeElement === options.searchInputRef.current) {
          options.searchInputRef.current.blur()
          return
        }
      }

      // 3. Alt + ArrowDown / ArrowRight: Move downwards (towards Transaction Log)
      if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowRight')) {
        e.preventDefault()
        if (navItems.length === 0) return
        const currentIndex = navItems.findIndex(item =>
          item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
        )
        const nextIndex = currentIndex < navItems.length - 1 ? currentIndex + 1 : 0
        navigate(navItems[nextIndex].path)
        return
      }

      // 4. Alt + ArrowUp / ArrowLeft: Move upwards (towards Dashboard)
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowLeft')) {
        e.preventDefault()
        if (navItems.length === 0) return
        const currentIndex = navItems.findIndex(item =>
          item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
        )
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : navItems.length - 1
        navigate(navItems[prevIndex].path)
        return
      }

      // 5. Alt + Home: Jump directly to the top item (Dashboard)
      if (e.altKey && e.key === 'Home') {
        e.preventDefault()
        if (navItems.length > 0) navigate(navItems[0].path)
        return
      }

      // 6. Alt + End: Jump directly to the bottom item (Transaction Log)
      if (e.altKey && e.key === 'End') {
        e.preventDefault()
        if (navItems.length > 0) navigate(navItems[navItems.length - 1].path)
        return
      }

      // 7. Toggle Shortcuts Help with '?' (Shift + /)
      if (e.key === '?' && !typing && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowShortcutsModal(prev => !prev)
        return
      }

      // 8. Number shortcuts: 1, 2, 3, 4, 5, 6, 7
      // Matches standard top row (Digit1..Digit7) which works without NumLock!
      const validNumbers = ['1', '2', '3', '4', '5', '6', '7']
      if (validNumbers.includes(e.key)) {
        // Alt + Number: triggers from anywhere
        if (e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          const target = navItems.find(item => item.key === e.key)
          if (target) navigate(target.path)
          return
        }

        // Direct Number: triggers when not typing and no modal dialog is open
        if (!e.altKey && !e.ctrlKey && !e.metaKey && !typing && !isModalOpen()) {
          e.preventDefault()
          const target = navItems.find(item => item.key === e.key)
          if (target) navigate(target.path)
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navItems, location.pathname, navigate, isTyping, isModalOpen, options])

  return {
    navItems,
    showShortcutsModal,
    setShowShortcutsModal,
    openShortcutsModal: () => setShowShortcutsModal(true),
    closeShortcutsModal: () => setShowShortcutsModal(false),
  }
}
