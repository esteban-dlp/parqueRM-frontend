import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ToastContainer } from '@/components/ui/Toast'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const openSidebar = useCallback(() => setSidebarOpen(true), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className={styles.app}>
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div
        className={[styles.overlay, sidebarOpen ? styles.open : ''].filter(Boolean).join(' ')}
        onClick={closeSidebar}
        aria-hidden="true"
      />
      <div className={styles.main}>
        <Topbar onMenuToggle={openSidebar} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
