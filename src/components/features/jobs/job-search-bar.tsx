'use client'

import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface JobSearchBarProps {
  value?: string
  onSearch: (query: string) => void
}

export function JobSearchBar({ value = '', onSearch }: JobSearchBarProps) {
  const [inputValue, setInputValue] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setInputValue(next)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      onSearch(next)
    }, 300)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div className="w-full">
      <Input
        icon={<Search className="h-5 w-5" />}
        placeholder="직무, 기술 스택, 회사명으로 검색..."
        value={inputValue}
        onChange={handleChange}
        className="h-12 text-base pl-12"
      />
    </div>
  )
}
