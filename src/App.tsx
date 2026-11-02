import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowSquareOut, ArrowsOut, Minus, Plus, X } from '@phosphor-icons/react'
import Story from './pages/Story'
import Structure from './pages/Structure'
import Electronics from './pages/Electronics'
import Reflection from './pages/Reflection'
import Future from './pages/Future'
const Virtual = lazy(() => import('./pages/Virtual'))
import { asset, documentDescriptions, documents, fileSize, sectionFromHash, sections } from './content/portfolio'
import type { ImageInfo } from './content/types'

type Modal = { kind: 'image'; image: ImageInfo } | { kind: 'sources' } | null
const pages = { story: Story, structure: Structure, electronics: Electronics, reflection: Reflection, future: Future, virtual: Virtual }

export default function App() {
  const [section, setSection] = useState(() => sectionFromHash(window.location.hash))
  const [modal, setModal] = useState<Modal>(null), [zoomed, setZoomed] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const currentIndex = sections.findIndex(item => item.id === section.id)
  const Page = pages[section.id]
  const closeModal = () => { dialog.current?.close(); setModal(null); setZoomed(false) }
  useEffect(() => {
    const navigate = () => {
      setSection(sectionFromHash(window.location.hash)); window.scrollTo(0, 0)
      dialog.current?.close(); setModal(null); setZoomed(false)
      requestAnimationFrame(() => document.getElementById('main-content')?.focus({ preventScroll: true }))
    }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])
  useEffect(() => { document.title = `${section.title} · 瓦力机器人｜实体、结构与制造` }, [section])
  useEffect(() => {
    if (!modal) return
    dialog.current?.showModal()
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [modal])

  return <div className="portfolio-app">
    <a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>跳到主要内容</a>
    <header className="site-header"><div className="header-inner"><a className="wordmark" href="#/" aria-label="瓦力机器人首页">WALL<span>·</span>E<span className="wordmark-caption">瓦力机器人</span></a><nav aria-label="章节导航">{sections.map(item => <a key={item.id} href={`#${item.path}`} aria-current={section.id === item.id ? 'page' : undefined}><span className="nav-number">{item.number}</span>{item.title}</a>)}</nav></div></header>
    <div className="course-bar"><span>《实体、结构与制造》课程项目</span><span>设计 · 制造 · 记录</span></div>
    <main id="main-content" className={`site-main page-${section.id}`} tabIndex={-1}><Suspense fallback={<p className="virtual-loading" role="status">正在打开虚拟平台…</p>}><Page openImage={image => { setZoomed(false); setModal({ kind: 'image', image }) }} openSources={() => setModal({ kind: 'sources' })} /></Suspense></main>
    <div className="chapter-pagination"><div>{currentIndex > 0 && <a href={`#${sections[currentIndex - 1].path}`} className="previous-chapter"><ArrowLeft size={18} /><span><small>上一章</small><strong>{sections[currentIndex - 1].title}</strong></span></a>}</div><span className="pagination-position">{section.number} / 06</span><div>{currentIndex < sections.length - 1 ? <a href={`#${sections[currentIndex + 1].path}`} className="next-chapter"><span><small>下一章</small><strong>{sections[currentIndex + 1].title}</strong></span><ArrowRight size={18} /></a> : <a href="#/" className="next-chapter"><span><small>回到开始</small><strong>故事与灵感</strong></span><ArrowRight size={18} /></a>}</div></div>
    <footer className="site-footer"><div><strong>瓦力机器人</strong><p>一次从电影灵感出发的设计与制造尝试。</p></div><div><span>胡承越 · 陆轩 · 朱兴宇 · 李汶远</span><span>《实体、结构与制造》课程小组作品</span></div><button className="quiet-button" onClick={() => setModal({ kind: 'sources' })}>资料与参考<ArrowSquareOut size={15} /></button></footer>

    <dialog ref={dialog} className={`material-dialog ${modal?.kind === 'image' ? 'lightbox-dialog' : 'sources-dialog'}`} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); closeModal() }} onClick={event => { if (event.target !== dialog.current) return; const bounds = dialog.current!.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeModal() }}>
      <div className="dialog-toolbar"><div><span className="small-heading">{modal?.kind === 'image' ? '图像资料' : '原始资料'}</span><h2 id="dialog-title">{modal?.kind === 'image' ? modal.image.title : '项目资料与参考'}</h2></div><div className="dialog-actions">{modal?.kind === 'image' && <><button className="icon-label" onClick={() => setZoomed(value => !value)} aria-label={zoomed ? '适合窗口' : '放大图像'}>{zoomed ? <Minus size={17} /> : <Plus size={17} />}<span>{zoomed ? '适合窗口' : '放大图像'}</span></button><a href={asset(modal.image.src)} download className="icon-label" aria-label="下载原图"><ArrowDown size={18} /><span>原图</span></a></>}<button className="close-button" onClick={closeModal} aria-label="关闭窗口"><X size={22} /></button></div></div>
      {modal?.kind === 'image' && <><div className={`lightbox-stage ${zoomed ? 'is-zoomed' : ''}`}><div className={`lightbox-image ${modal.image.rotated ? 'blueprint-art' : ''}`}><img src={asset(modal.image.src)} alt={modal.image.title} /></div></div>{modal.image.caption && <p className="lightbox-caption">{modal.image.caption}</p>}</>}
      {modal?.kind === 'sources' && <div className="sources-content"><p className="dialog-intro">项目设计、打印分工与接线方案。</p><div className="source-document-list">{documents.map(document => <a key={document.path} href={asset(document.path)} download={document.name}><div><strong>{document.name === '本组打印数量.txt' ? `${document.path.split('/').at(-2)} · 打印数量` : document.name}</strong><p>{documentDescriptions[document.name] || '结构零件分类与打印数量'}</p></div><span>{fileSize(document.bytes)}</span><ArrowDown size={17} /></a>)}</div><section className="external-references"><h3>外部参考</h3><p>以下链接需要联网查看。</p><a href="https://www.pixar.com/wall-e" target="_blank" rel="noreferrer">Disney · Pixar《WALL·E》电影介绍<ArrowSquareOut size={16} /></a><a href="https://ottodiy.tech/playground/" target="_blank" rel="noreferrer">Otto 动作编排参考<ArrowSquareOut size={16} /></a></section><div className="source-origin-note"><ArrowsOut size={17} /><p>本网站使用原始资料的副本。概念图用于讨论未来设计；STL 预览来自真实零件文件。虚拟平台提供整机旋转查看，含单独记录的展示用补建件。</p></div></div>}
    </dialog>
  </div>
}
