import { NavLink } from 'react-router'
import styles from './Tabs.module.scss'

const TABS = [
  { to: '/long-polling', label: 'Long polling' },
  { to: '/server-sent-events', label: 'Server-Sent Events' },
  { to: '/websocket', label: 'WebSocket' },
]

const Tabs = () => {
  return (
    <nav className={styles.tabs}>
      {TABS.map(({ to, label }) => (
        // NavLink сам ставит aria-current="page" активной вкладке
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export default Tabs
