import s from './Button.module.css'
export default function Button({ children, variant='primary', size, full, onClick, disabled, style }) {
  const cls = [s.btn, s[variant], size && s[size], full && s.full].filter(Boolean).join(' ')
  return <button className={cls} onClick={onClick} disabled={disabled} style={style}>{children}</button>
}
