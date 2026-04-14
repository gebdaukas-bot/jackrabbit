import { GOLD } from "../utils/scoring";

const FLOATERS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  emoji: ["⛳","🏌️","🏌️‍♀️","🏅","🏆","⛳","🏌️","⛳"][i % 8],
  left: `${(i * 19 + 5) % 93}%`,
  size: 13 + (i * 5) % 16,
  duration: 18 + (i * 3) % 10,
  delay: -(i * 2.9),
  drift: (i % 2 === 0 ? 1 : -1) * (12 + (i * 11) % 26),
}));

export default function LiveBackground() {
  return (
    <>
      <style>{`
        @keyframes lbGrad {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes lbFloat {
          0%   { transform: translateY(110vh) translateX(0px) rotate(0deg); opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 0.25; }
          100% { transform: translateY(-10vh) translateX(var(--lb-drift)) rotate(360deg); opacity: 0; }
        }
      `}</style>
      <div style={{
        position:"fixed", inset:0, zIndex:-3,
        background:"linear-gradient(135deg,#020c18 0%,#0a1f1a 25%,#071428 50%,#0d1f10 75%,#020c18 100%)",
        backgroundSize:"400% 400%",
        animation:"lbGrad 20s ease infinite",
      }}/>
      <div style={{
        position:"fixed", inset:0, zIndex:-2, opacity:0.025,
        backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
        backgroundSize:"40px 40px",
      }}/>
      {FLOATERS.map(f=>(
        <div key={f.id} style={{
          position:"fixed", left:f.left, bottom:"-10vh", zIndex:-1,
          fontSize:f.size, userSelect:"none", pointerEvents:"none",
          "--lb-drift":`${f.drift}px`,
          animation:`lbFloat ${f.duration}s linear ${f.delay}s infinite`,
          filter:"blur(0.5px)",
        }}>{f.emoji}</div>
      ))}
      <div style={{position:"fixed",top:"8%",left:"4%",width:260,height:260,borderRadius:"50%",background:`radial-gradient(circle,${GOLD}09 0%,transparent 70%)`,zIndex:-1,filter:"blur(30px)"}}/>
      <div style={{position:"fixed",bottom:"18%",right:"6%",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,#1a4a2a1a 0%,transparent 70%)",zIndex:-1,filter:"blur(25px)"}}/>
    </>
  );
}
