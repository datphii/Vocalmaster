import s from './DeckCard.module.css'
import Button from '../Button/Button.jsx'

export default function DeckCard({ variant='manual', icon, title, description, count, learned, buttonText, onAction, style }) {
  const pct = count > 0 ? Math.round((learned || 0) / count * 100) : 0
  return (
    <div className={`${s.card} ${s[variant]}`} style={{ animationDelay: style?.animationDelay, ...style }} onClick={onAction}>
      <div className={s.iconWrap}>{icon}</div>
      <div className={s.title}>{title}</div>
      <div className={s.desc}>{description}</div>
      {count > 0 && (
        <>
          <div className={s.meta}>
            <span className={s.badge}>{count} words</span>
            {learned > 0 && <span className={s.badge}>{pct}% learned</span>}
          </div>
          <div className={s.progress}>
            <div className={s.progressFill} style={{ width: pct + '%' }} />
          </div>
        </>
      )}
      {buttonText && <Button variant={variant === 'ai' ? 'primary' : 'secondary'} size="sm">{buttonText}</Button>}
    </div>
  )
}
