'use client'

import { useRef, useEffect, TextareaHTMLAttributes } from 'react'

export function AutoResizeTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = () => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = `${ref.current.scrollHeight}px`
    }
  }

  useEffect(() => {
    resize()
  }, [props.value])

  return (
    <textarea
      {...props}
      ref={ref}
      onInput={(e) => {
        resize()
        props.onInput?.(e)
      }}
      className={`${props.className} overflow-hidden`}
    />
  )
}
