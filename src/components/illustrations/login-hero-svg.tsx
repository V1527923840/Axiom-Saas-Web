import { RotatingSphere } from "./rotating-sphere"

/**
 * 登录/注册页右侧品牌位插画（SVG 版）。
 *
 * - AXIOM 标题 / 中英文标语：静态
 * - 中间球体：真正的 3D 旋转（JS 每帧重算透视投影 + 深度排序），
 *   详见 `./rotating-sphere.tsx`
 * - 通过 `currentColor` 着色，配合外层 `invert dark:invert-0` 自动适配明暗主题
 *
 * viewBox 与原图（514x736）一致，`preserveAspectRatio="xMidYMid meet"`
 * 保证在任何列宽下整体可见、不溢出。
 */
export function LoginHeroSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 514 736"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-label="Axiom — 助力投资者高效投研"
      role="img"
    >
      <title>Axiom — 助力投资者高效投研</title>

      {/* AXIOM 标题 */}
      <text
        x="257"
        y="175"
        textAnchor="middle"
        fill="currentColor"
        fontSize="64"
        fontWeight="700"
        letterSpacing="5"
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
      >
        AXIOM
      </text>

      {/* 球体（真 3D 旋转） */}
      <g transform="translate(257 395)">
        <RotatingSphere scale={175} perspective={1400} />
      </g>

      {/* 中文标语 */}
      <text
        x="257"
        y="605"
        textAnchor="middle"
        fill="currentColor"
        fontSize="22"
        fontWeight="600"
        fontFamily="system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif"
      >
        助力投资者高效投研
      </text>
      {/* 英文标语 */}
      <text
        x="257"
        y="630"
        textAnchor="middle"
        fill="currentColor"
        fontSize="11"
        fontWeight="400"
        opacity="0.7"
        letterSpacing="0.5"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        Helping Investors in Efficient Investment Research
      </text>
    </svg>
  )
}