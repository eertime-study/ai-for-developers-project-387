import { Outlet } from 'react-router-dom'
import { useOwner } from '@/api/queries'
import { AppShell } from '@/components/AppShell'

export default function App() {
  const { data: owner } = useOwner()
  return (
    <AppShell ownerTimeZone={owner?.timeZone}>
      <Outlet />
    </AppShell>
  )
}
