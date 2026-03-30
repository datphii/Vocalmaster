import { catColor } from '../../data/vocab.js'

export default function TableView({ words, learned }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', fontSize: 13 }}>
        <thead>
          <tr>
            {['#', 'Word', 'Cat', 'Definition'].map(h => (
              <th key={h} style={{ background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', padding: '14px 16px', textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {words.map((v, i) => (
            <tr key={v.fid || v.id}>
              <td style={{ padding: '12px 16px', color: 'var(--text-light)', borderBottom: '1px solid var(--border-light)' }}>{i + 1}</td>
              <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{v.word}</div>
                <div style={{ fontSize: 11, color: 'var(--primary)', fontFamily: 'monospace' }}>{v.phonetic}</div>
              </td>
              <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: 11, color: catColor(v.cat), background: catColor(v.cat) + '15', padding: '3px 8px', borderRadius: 10, fontWeight: 600 }}>{v.cat}</span>
              </td>
              <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', lineHeight: 1.6, borderBottom: '1px solid var(--border-light)', maxWidth: 400 }}>{v.def}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
