import { DocumentLink, Figure, PageHeading, PowerDiagram, SectionHeading } from '../components/PortfolioParts'
import type { PageProps } from '../content/types'

const components = [
  ['ESP32-S3 主控板', '沿用 Otto 小智 AI 开发板，接收交互指令。'],
  ['Arduino Leonardo', '承接主控指令，分配舵机与电机的控制任务。'],
  ['PCA9685 舵机控制板', '连接多路舵机，控制头颈、眼部和手臂动作。'],
  ['L298P 电机驱动板', '驱动两台 JGB37-520 直流减速电机，带动履带。'],
  ['3S 锂电池与降压模块', '提供整机电源，通过两路降压为低压设备供电。'],
  ['OV2640 与 ESP32-S3 CAM', '新增的摄像头与视觉处理板，负责采集和处理图像。'],
]

const modules = [
  { title: '电源与降压系统', model: '3S 锂电池 · 双降压模块', description: '电池输出分为三路：两路经降压模块转换为 5.2 V，分别供给主控、舵机控制板、Arduino 和摄像头板；另一路直接接入电机驱动板。各模块共地，使通信和控制信号具有共同的电位基准。' },
  { title: 'ESP32 模块', model: 'Otto 小智 AI · ESP32-S3', description: '复用已有的小智 AI 开发板作为主控，接收交互指令，并向 Arduino 发送动作要求。加入摄像头后，主控还负责接收视觉处理板返回的识别结果，衔接视觉与运动控制。' },
  { title: 'Arduino 模块', model: 'Arduino Leonardo', description: '作为主控与执行机构之间的中间层，将动作指令分配给舵机控制板和电机驱动板，分别控制关节运动与履带行走，让交互处理和动作控制各有分工。' },
  { title: '舵机控制板', model: 'PCA9685', description: '通过 I²C 与 Arduino 通信，输出多路 PWM 信号，控制转头、颈部上下端、左右眼和左右手等舵机。各关节使用独立通道，便于分别调整角度和组合动作。' },
  { title: '电机控制板', model: 'L298P · 双路直流电机驱动', description: '接收 Arduino 的控制信号，通过 MOTOR A、MOTOR B 两个输出端分别连接左右履带电机，控制转向与速度。两侧电机的速度和方向组合形成前进、后退与转弯动作。' },
]

function ControlChain({ items, label }: { items: string[]; label: string }) {
  return <div className="control-chain" aria-label={label}>{items.map((item, index) => <div key={item}><span>{item}</span>{index < items.length - 1 && <b aria-hidden="true">→</b>}</div>)}</div>
}

export default function Electronics({ openImage }: PageProps) {
  return <>
    <PageHeading number="03" title="电路与搭建">完成实体结构的设计与打印后，我们把重点转向电路搭建：将主控、驱动板、舵机与履带电机连接起来，让结构中的各个关节和行走机构能够响应控制指令。</PageHeading>

    <section className="page-section electronics-components">
      <SectionHeading number="01" title="主要电子配件" />
      <dl className="electronics-parts">{components.map(([name, description]) => <div key={name}><dt>{name}</dt><dd>{description}</dd></div>)}</dl>
    </section>

    <section className="page-section">
      <SectionHeading number="02" title="整体电路设计" />
      <Figure name="circuit.png" title="整体接线图" caption="基础接线方案 · ESP32、Arduino 与舵机 / 电机驱动" openImage={openImage} />
      <div className="electronics-overview">
        <ControlChain label="主控到执行机构的控制路径" items={['ESP32 主控', 'Arduino', '舵机 / 电机驱动板', '关节动作 / 履带行走']} />
        <div className="electronics-prose">
          <p>整体采用 ESP32 与 Arduino 分工的控制方式：ESP32 接收交互指令，Arduino 负责具体的动作控制，再由 PCA9685 和 L298P 分别驱动舵机与履带电机。前期我们尝试过由小智直接驱动舵机和电机，但调试效果不够稳定，因此加入 Arduino 作为中间层，分担控制任务。</p>
          <p>接线分为信号与供电两部分。信号沿主控、Arduino、驱动板传递到执行机构；供电从同一块电池分出低压设备支路与电机动力支路，各模块通过共地建立信号连接。</p>
        </div>
      </div>
    </section>

    <section className="page-section">
      <SectionHeading number="03" title="各模块的连接与分工" />
      <div className="circuit-modules">{modules.map((module, index) => <article key={module.title}>
        <div className="circuit-module-heading"><span className="section-index">0{index + 1}</span><div><h3>{module.title}</h3><span>{module.model}</span></div></div>
        <p>{module.description}</p>
      </article>)}</div>
    </section>

    <section className="page-section">
      <SectionHeading number="04" title="新增摄像头模块" />
      <div className="electronics-prose"><p>在基础电路上，我们增加 OV2640 摄像头和一块独立的 ESP32-S3 CAM 视觉处理板。摄像头通过 FPC 软排线接入视觉板，由视觉板负责图像采集和处理，再通过 UART 将识别结果传给原 ESP32 主控，交由 Arduino 执行动作。</p></div>
      <ControlChain label="新增摄像头后的视觉与运动控制路径" items={['OV2640', 'ESP32-S3 CAM', '原 ESP32 主控', 'Arduino', '舵机 / 电机']} />
      <div className="table-scroll camera-wiring"><table className="document-table"><caption>摄像头与主控的接线</caption><thead><tr><th scope="col">连接起点</th><th scope="col">接入位置</th><th scope="col">作用</th></tr></thead><tbody>
        <tr><td>OV2640 · FPC 软排线</td><td>ESP32-S3 CAM 摄像头接口</td><td>传输图像数据</td></tr>
        <tr><td>视觉板 GPIO1（TX）</td><td>原 ESP32 主控的可用 UART RX</td><td>向主控发送视觉结果</td></tr>
        <tr><td>视觉板 GPIO2（RX）</td><td>原 ESP32 主控的可用 UART TX</td><td>接收主控指令</td></tr>
        <tr><td>视觉板 GND</td><td>原 ESP32 主控 GND</td><td>建立共同地线</td></tr>
      </tbody></table></div>
      <div className="two-column-prose"><div><h3>视觉处理单独分工</h3><p>新增视觉板承担图像处理，原 ESP32 保留交互与指令调度职责。视觉结果沿既有控制链路传递，Arduino 继续负责舵机和电机的动作控制。</p></div><div><h3>摄像头独立分支取电</h3><p>ESP32-S3 CAM 从降压模块 B 的输出端并联取电，与 Arduino 分别接入独立输出支路。供电接入对应电源端，通信采用 TX、RX 交叉连接，并连接 GND。</p></div></div>
    </section>

    <section className="page-section">
      <SectionHeading number="05" title="电源系统：一块电池，三路供电">3S 锂电池标称 11.1 V，满电 12.6 V，通过 XT60 一公转三母转接线分配给三条支路。</SectionHeading>
      <PowerDiagram />
      <div className="two-column-prose"><div><h3>按设备电压分路</h3><p>两块降压模块的输出均设为 5.2 V：A 路连接原 ESP32-S3 主控板与 PCA9685，B 路连接 Arduino Leonardo 与 ESP32-S3 CAM。L298P 通过 PWRIN 独立接收电池原电压，再驱动两台 12 V JGB37-520 直流减速电机。</p></div><div><h3>集中分线，动力单独供电</h3><p>每块降压模块配一套“二进四出”分线端子，正、负极分别分线并相互绝缘。电机动力支路与 Arduino 的 5 V 支路分开，所有模块共地；动力供电使用与负载电流匹配的导线和端子，避免由杜邦线承担较大电流。</p></div></div>
      <div className="source-documents"><DocumentLink name="瓦力机器人接线调整方案.pdf" label="在线查看接线调整方案 PDF" view /><DocumentLink name="瓦力机器人接线调整方案.pdf" label="下载接线调整方案 PDF" /></div>
    </section>
  </>
}
