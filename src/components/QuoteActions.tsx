'use client'
import React from 'react'
import { useForm, useField, Button } from '@payloadcms/ui'

export const QuoteActions: React.FC = () => {
  // Pobieramy dostęp do ukrytych pól sterujących wysyłką
  const { setValue: setSendQuote } = useField<boolean>({ path: 'actionSendQuote' })
  const { setValue: setSendSub } = useField<boolean>({ path: 'actionSendSubscription' })
  
  // Pobieramy metodę submit, aby zapisać dokument po kliknięciu
  const { submit } = useForm()

  const onSendQuote = async () => {
    if (window.confirm('Czy na pewno chcesz wysłać tę wycenę do klienta?')) {
      await setSendQuote(true)
      await submit()
    }
  }

  const onSendSub = async () => {
    if (window.confirm('Czy na pewno chcesz wysłać link do subskrypcji?')) {
      await setSendSub(true)
      await submit()
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '12px', 
      padding: '20px', 
      background: '#f3f3f3', 
      borderRadius: '8px',
      border: '1px solid #ddd',
      marginTop: '20px'
    }}>
      <h4 style={{ margin: 0, fontSize: '14px', color: '#666', textTransform: 'uppercase' }}>Akcje Poziomu 5</h4>
      <div style={{ display: 'flex', gap: '10px' }}>
        <Button 
          type="button" 
          onClick={onSendQuote} 
          buttonStyle="primary"
          size="small"
        >
          WYŚLIJ WYCENĘ DO KLIENTA
        </Button>
        
        <Button 
          type="button" 
          onClick={onSendSub} 
          buttonStyle="secondary"
          size="small"
        >
          WYŚLIJ LINK DO SUBSKRYPCJI
        </Button>
      </div>
      <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
        Kliknięcie przycisku ustawi odpowiednią flagę i automatycznie zapisze dokument, co wywoła wysyłkę e-mail.
      </p>
    </div>
  )
}
