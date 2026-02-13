// app/(app)/guests/editor/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, GripVertical, Save } from 'lucide-react'

type Field = {
  id?: string
  label: string
  name: string
  type: 'text' | 'tel' | 'email' | 'date' | 'select' | 'checkbox'
  options?: string[]
  required: boolean
  order_index: number
  is_active: boolean
}

export default function FormEditor() {
  const [fields, setFields] = useState<Field[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchFields() }, [])

  async function fetchFields() {
    const { data } = await supabase.from('form_fields').select('*').order('order_index')
    setFields(data || [])
  }

  async function saveFields() {
    setSaving(true)
    const toSave = fields.map((f, i) => ({ ...f, order_index: i * 10 }))
    await fetch('/api/guests/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_AUTH_PASSWORD || 'super-secret'}` },
      body: JSON.stringify(toSave)
    })
    setSaving(false)
    alert('Анкета сохранена! Изменения уже на /card')
  }

  function addField() {
    setFields([...fields, {
      label: 'Новое поле',
      name: 'new_field',
      type: 'text',
      required: false,
      order_index: fields.length * 10,
      is_active: true
    }])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Редактор анкеты (/card)</h1>
        
        <button onClick={saveFields} disabled={saving} className="mb-6 flex items-center gap-3 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition">
          <Save className="w-5 h-5" />
          {saving ? 'Сохраняем...' : 'Сохранить анкету'}
        </button>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id || index} className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
              <GripVertical className="text-gray-400 cursor-move w-6 h-6" />
              
              <input
                type="text"
                value={field.label}
                onChange={e => {
                  const newFields = [...fields]
                  newFields[index].label = e.target.value
                  newFields[index].name = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_')
                  setFields(newFields)
                }}
                className="font-medium text-lg w-64 border-b-2 border-gray-300 focus:border-purple-500 outline-none"
              />

              <select
                value={field.type}
                onChange={e => {
                  const newFields = [...fields]
                  newFields[index].type = e.target.value as any
                  setFields(newFields)
                }}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="text">Текст</option>
                <option value="tel">Телефон</option>
                <option value="email">Email</option>
                <option value="date">Дата</option>
                <option value="select">Выбор</option>
                <option value="checkbox">Чекбокс</option>
              </select>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={e => {
                    const newFields = [...fields]
                    newFields[index].required = e.target.checked
                    setFields(newFields)
                  }}
                />
                <span className="text-sm">Обязательно</span>
              </label>

              <button onClick={() => setFields(fields.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        <button onClick={addField} className="mt-8 flex items-center gap-3 text-purple-600 hover:text-purple-800 font-medium">
          <Plus className="w-6 h-6" />
          Добавить поле
        </button>
      </div>
    </div>
  )
}