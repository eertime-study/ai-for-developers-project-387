import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-background p-12 text-center">
      <div className="text-4xl font-semibold text-foreground">404</div>
      <p className="text-sm text-muted-foreground">Страница не найдена.</p>
      <Button asChild>
        <Link to="/">Вернуться к типам встреч</Link>
      </Button>
    </div>
  )
}
