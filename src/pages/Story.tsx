import { ArrowRight, Files } from '@phosphor-icons/react'
import { Figure, SectionHeading } from '../components/PortfolioParts'
import { members } from '../content/portfolio'
import type { PageProps } from '../content/types'

export default function Story({ openImage, openSources }: PageProps) {
  return <>
    <section className="story-hero">
      <div className="hero-copy"><div className="section-kicker"><span>01</span>故事与灵感</div><h1>瓦力机器人</h1><p className="hero-subtitle">从《机器人总动员》出发，<br />亲手创造一个有温度的机器人。</p><p className="hero-description">在完成 Otto 机器人的组装后，我们在小组讨论与老师的建议下，决定继续探索新的机器人设计。电影中的瓦力给了我们灵感：沿用已有的 ESP32 主控，用自己的双手复刻这个充满好奇与情感的角色。</p><div className="hero-links"><a className="primary-link" href="#/structure">查看我们的设计<ArrowRight size={17} /></a><button className="quiet-button" onClick={openSources}><Files size={16} />项目资料</button></div></div>
      <Figure name="concept-blueprint.png" title="瓦力机器人构想图" caption="" rotated openImage={openImage} className="hero-figure" />
    </section>
    <section className="page-section story-section"><SectionHeading number="01" title="电影里的瓦力">从孤独的守望者，到唤醒情感与希望的同行者。</SectionHeading><div className="story-layout"><div className="story-scenes">
      <article><span>01 / 守望</span><h3>在被遗忘的地球上，珍藏生活的痕迹</h3><p>在《机器人总动员》描绘的未来，地球已被垃圾覆盖，人类乘坐飞船离开。瓦力留在空旷的城市里，日复一日地清理、压缩垃圾，成为这片荒芜土地上仍在工作的机器人。</p><p>重复的劳动没有磨去他的好奇。他把人类遗留下来的小物件一件件带回住处，认真整理、珍藏，也从旧歌舞片中学习牵手与相伴。那些被丢弃的东西，成为他理解生活、情感与爱的入口。孤独的机械身影因此有了鲜明的个性，也有了对陪伴的向往。</p></article>
      <article><span>02 / 相遇</span><h3>一株植物，一次跨越星际的追随</h3><p>探测机器人伊娃来到地球后，瓦力的日常发生了变化。他小心翼翼地靠近她，向她展示自己的收藏，把发现的一株绿色植物交给她。当伊娃被回收飞船带走，瓦力也追随她来到人类居住的飞船上。</p><p>在那里，人类的生活高度依赖自动化系统：屏幕与代步设备包围日常，人们逐渐疏远了劳动、行走和彼此的接触。那株植物带来了地球可以重新孕育生命的希望，而飞船的自动驾驶系统却试图阻止返航。瓦力与伊娃一起守护植物、帮助人类回家，瓦力也在过程中受到重创。</p></article>
      <article><span>03 / 归来</span><h3>被唤醒的情感，与重新开始的生活</h3><p>回到地球后，伊娃修好了瓦力，但他一度失去记忆与个性，又变成只会执行清理任务的普通机器。伊娃拿出熟悉的物件，重现相识时的动作，努力唤回那个会好奇、会珍惜、会回应的瓦力。最终，一个“吻”唤醒了他，也让他们重新认出了彼此。</p><p>人类也在返航之后重新学习亲手劳动，开始修复自己的家园。故事把希望落在了具体的行动与关系中：一株被守护的植物、一件被珍藏的旧物、一次主动的牵手，都能成为重新感受生活的起点。</p></article>
    </div><aside className="story-observation"><span className="small-heading">瓦力的性格，怎样被看见</span><dl><div><dt>双目与眼部倾斜</dt><dd>注视、疑惑、低落</dd></div><div><dt>头部与颈部俯仰</dt><dd>注意、犹豫、好奇</dd></div><div><dt>手臂与身体姿态</dt><dd>试探、表达、回应</dd></div><div><dt>速度与停顿</dt><dd>为同一个动作赋予不同情绪</dd></div></dl><p>电影用眼神、姿态与动作，让我们读懂了瓦力的温柔。我们也希望把这种好奇与陪伴，转化为看得见、感受得到的机器人表达。</p></aside></div></section>
    <section className="page-section"><SectionHeading number="02" title="从 Otto 到瓦力：我们的设计灵感">从一次课程组装出发，继续探索机器人可以拥有的形象与性格。</SectionHeading><div className="choice-layout"><div><p>按照《实体、结构与制造》课程要求，我们先购买了 Otto 机器人，并成功完成组装。在这个基础上，小组开始讨论：能否进一步设计一种新的机器人，让课程中的结构与制造知识承载我们自己的创意？结合老师的建议，我们把目光投向了《机器人总动员》中的瓦力。</p><p>瓦力身上的好奇、温柔与对旧物的珍惜，让我们想到今天与技术相处的方式。当 AI 越来越多地参与学习与工作，我们也希望保留主动思考、亲手创造和感受生活的能力。电影中人类重新开始劳动、瓦力因情感而被唤醒的情节，给了我们一个朴素的出发点：用自己的双手，创造一个能传递温度的机器人。</p><p>因此，我们决定沿用原来 Otto 机器人的 ESP32 主控，以电影中的瓦力为原型，重新设计机器人的机身、履带、头颈、双眼和手臂。我们希望通过复刻这个熟悉的角色，让电影中的神态与动作进入真实空间，让观察、转头和伸手这些简单行为，也能表达好奇、关心与陪伴。</p><p>我们希望这台瓦力能提醒人们，在学习或工作的忙碌中，给自己留一点停下来感受生活的时间。像瓦力珍藏那些普通小物件一样，重新看见日常的价值，保留自己的热爱，也珍惜人与人之间具体的连接。</p><a className="inline-link" href="#/structure">下一步：看结构与制造<ArrowRight size={16} /></a></div><div className="project-facts"><div><span>课程</span><strong>《实体、结构与制造》</strong></div><div><span>设计原型</span><strong>电影《机器人总动员》中的瓦力</strong></div><div><span>小组</span><strong>{members.join('、')}</strong></div><div><span>设计起点</span><strong>沿用 Otto 机器人的 ESP32 主控</strong></div></div></div></section>
  </>
}
