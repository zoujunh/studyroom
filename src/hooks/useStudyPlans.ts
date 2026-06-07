import { useCallback, useState, useEffect } from 'react'
import { api } from '../utils/api'
import { isLoggedIn } from '../utils/auth'

interface Plan {
  id: number
  title: string
  time: string
  completed: boolean
}

export function useStudyPlans() {
  const [plans, setPlans] = useState<Plan[]>([])

  // Load plans from API on mount
  useEffect(() => {
    if (isLoggedIn()) {
      api.getPlans().then((result) => {
        setPlans(result.plans)
      }).catch(console.error)
    }
  }, [])

  const addPlan = useCallback((title: string, time: string) => {
    if (isLoggedIn()) {
      api.createPlan(title, time).then((result) => {
        setPlans(prev => [result.plan, ...prev])
      }).catch(console.error)
    }
  }, [])

  const togglePlan = useCallback((id: number) => {
    setPlans(prev => {
      const plan = prev.find(p => p.id === id)
      if (plan && isLoggedIn()) {
        api.updatePlan(id, !plan.completed).catch(console.error)
        return prev.map(p => p.id === id ? { ...p, completed: !p.completed } : p)
      }
      return prev
    })
  }, [])

  const deletePlan = useCallback((id: number) => {
    if (isLoggedIn()) {
      api.deletePlan(id).catch(console.error)
    }
    setPlans(prev => prev.filter(p => p.id !== id))
  }, [])

  return {
    plans,
    addPlan,
    togglePlan,
    deletePlan,
  }
}
