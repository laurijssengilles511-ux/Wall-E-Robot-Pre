import { ArrowDown, ArrowSquareOut, ArrowsOut, FileText } from '@phosphor-icons/react'
import type { ImageInfo, PageProps } from '../content/types'
import { asset, documentNamed, fileSize, imagePath } from '../content/portfolio'

export function PageHeading({ number, title, children, label = '课程项目记录' }: { number: string; title: string; children?: React.ReactNode; label?: string }) {
  return <header className="page-heading"><div className="section-kicker"><span>{number}</span>{label}</div><h1>{title}</h1>{children && <p>{children}</p>}</header>
}
export function SectionHeading({ number, title, children }: { number?: string; title: string; children?: React.ReactNode }) {
  return <div className="section-heading">{number && <span className="section-index">{number}</span>}<div><h2>{title}</h2>{children && <p>{children}</p>}</div></div>
}
export function Figure({ name, title, caption, rotated = false, openImage, className = '', showCaption = true }: { name: string; title: string; caption: string; rotated?: boolean; className?: string; showCaption?: boolean } & Pick<PageProps, 'openImage'>) {
  const info: ImageInfo = { src: imagePath(name), title, caption, rotated }
  return <figure className={`material-figure ${className}`}><button className={`figure-button ${rotated ? 'blueprint-art' : ''}`} onClick={() => openImage(info)} aria-label={`放大查看：${title}`}><img src={asset(info.src)} alt={title} loading="lazy" /><span className="figure-enlarge"><ArrowsOut size={16} />放大</span></button>{showCaption && <figcaption><span>{title}</span><span>{caption}</span></figcaption>}</figure>
}
export function DocumentLink({ name, label, view = false }: { name: string; label?: string; view?: boolean }) {
  const document = documentNamed(name)
  return <a className="document-link" href={asset(document.path)} download={view ? undefined : document.name} target={view ? '_blank' : undefined} rel={view ? 'noreferrer' : undefined}><FileText size={17} /><span>{label || document.name}</span><span className="document-size">{fileSize(document.bytes)}</span>{view ? <ArrowSquareOut size={15} /> : <ArrowDown size={15} />}</a>
}
export function SourceNote({ children }: { children: React.ReactNode }) { return <p className="source-note">{children}</p> }

export function PowerDiagram() {
  return <figure className="power-diagram"><div className="diagram-title"><span>供电分路设计</span><span>两路降压 · 一路电机动力</span></div><div className="diagram-scroll"><svg viewBox="0 0 980 370" role="img" aria-label="3S 电池分三路：降压 A 至 ESP32 和 PCA9685，降压 B 至 Arduino 和摄像头板，原电压至 L298P 及双电机">
    <defs><marker id="arrow-power" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="#a78a35" /></marker></defs>
    <g fill="none" stroke="#b59c54" strokeWidth="1.6" markerEnd="url(#arrow-power)"><path d="M192 185H240V76H300"/><path d="M192 185H300"/><path d="M192 185H240V294H300"/><path d="M505 76H591"/><path d="M505 185H591"/><path d="M505 294H591"/></g>
    <g fill="#f4edda" stroke="#d9c992"><rect x="25" y="142" width="167" height="86" rx="3"/><rect x="300" y="42" width="205" height="68" rx="3"/><rect x="300" y="151" width="205" height="68" rx="3"/><rect x="300" y="260" width="205" height="68" rx="3"/></g>
    <g fill="#fff" stroke="#dcdcd4"><rect x="591" y="42" width="354" height="68" rx="3"/><rect x="591" y="151" width="354" height="68" rx="3"/><rect x="591" y="260" width="354" height="68" rx="3"/></g>
    <g fill="#383a31" fontFamily="Microsoft YaHei, sans-serif" fontSize="16" textAnchor="middle"><text x="108" y="176">3S 锂电池</text><text x="402" y="69">降压模块 A</text><text x="402" y="178">降压模块 B</text><text x="402" y="287">L298P 电机驱动</text><text x="768" y="72">ESP32 主控 / PCA9685</text><text x="768" y="181">Arduino / ESP32-S3 CAM</text><text x="768" y="290">两台履带直流减速电机</text></g>
    <g fill="#8b8a7b" fontFamily="Microsoft YaHei, sans-serif" fontSize="12" textAnchor="middle"><text x="108" y="202">标称 11.1 V · 满电 12.6 V</text><text x="402" y="94">输出设定 5.2 V</text><text x="402" y="203">输出设定 5.2 V</text><text x="402" y="312">电池原电压输入</text><text x="768" y="96">主控与舵机控制支路</text><text x="768" y="205">控制器与视觉支路</text><text x="768" y="314">电机动力支路</text></g>
  </svg></div><figcaption>各模块共地；电机动力独立接入 L298P 的 PWRIN。</figcaption></figure>
}
