'use client'
import React from 'react'
import { useForm, useField, Button } from '@payloadcms/ui'

export const QuoteActions: React.FC = () => {
  const { setValue: setSendQuote } = useField<boolean>({ path: 'actionSendQuote' })
  const { setValue: setSendSubscription } = useField<boolean>({ path: 'actionSendSubscription' })
  const { setValue: setSendFinalPayment } = useField<boolean>({ path: 'actionSendFinalPayment' })
  const { value: paymentStatus } = useField<string>({ path: 'paymentStatus' })
  const { submit } = useForm()

  const onSendQuote = async () => {
    if (window.confirm('Czy na pewno chcesz wysłać tę wycenę do klienta?')) {
      await setSendQuote(true)
      await submit()
    }
  }

  const onSendSubscription = async () => {
    if (window.confirm('Wysłać klientowi link do subskrypcji utrzymania? Upewnij się, że cena utrzymania jest ustawiona.')) {
      await setSendSubscription(true)
      await submit()
    }
  }

  const onSendFinalPayment = async () => {
    if (window.confirm('Wysłać klientowi link do płatności II raty (pozostałe 50%)?')) {
      await setSendFinalPayment(true)
      await submit()
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '0',
      marginTop: '20px'
    }}>
      <h4 style={{ margin: 0, fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Akcje</h4>
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
          onClick={onSendSubscription}
          buttonStyle="secondary"
          size="small"
        >
          WYŚLIJ LINK SUBSKRYPCJI
        </Button>

        {paymentStatus === 'paid_half' && (
          <Button
            type="button"
            onClick={onSendFinalPayment}
            buttonStyle="primary"
            size="small"
          >
            WYŚLIJ LINK II RATY (50%)
          </Button>
        )}
      </div>
      {paymentStatus === 'paid_half' && (
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          I rata opłacona — możesz wysłać klientowi link do płatności końcowej.
        </p>
      )}
    </div>
  )
}
