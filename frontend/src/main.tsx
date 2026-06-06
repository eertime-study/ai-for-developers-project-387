import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import App from './App'
import EventTypesListPage from './routes/EventTypesListPage'
import SlotPickerPage from './routes/SlotPickerPage'
import BookingFormPage from './routes/BookingFormPage'
import BookingSuccessPage from './routes/BookingSuccessPage'
import AdminPage from './routes/AdminPage'
import NotFoundPage from './routes/NotFoundPage'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <EventTypesListPage /> },
      { path: 'event-types/:eventTypeId', element: <SlotPickerPage /> },
      { path: 'event-types/:eventTypeId/book', element: <BookingFormPage /> },
      { path: 'bookings/success', element: <BookingSuccessPage /> },
      { path: 'admin/bookings', element: <AdminPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
