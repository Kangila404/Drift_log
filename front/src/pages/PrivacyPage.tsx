import { useNavigate } from "react-router-dom";

const UPDATED = "2026년 6월 16일";
const EFFECTIVE = "2026년 6월 16일";
const CONTACT = "ia3264666@gmail.com";

export default function PrivacyPage({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate();

  const goBack = () => {
    if (onBack) return onBack()                     // 앱: 부모가 넘긴 뒤로가기
    if (window.history.length > 1) navigate(-1)      // 웹: 직전 페이지
    else navigate('/')                               // 히스토리 없으면 모드선택
  }

  return (
    <div style={st.wrap}>
      <div style={st.inner}>
        <button onClick={goBack} style={{ ...st.back, background: "none", border: "none", cursor: "pointer", padding: 0 }}>‹ 돌아가기</button>

        <header style={st.header}>
          <div style={st.eyebrow}>DRIFTLOG · PRIVACY POLICY</div>
          <h1 style={st.h1}>개인정보처리방침</h1>
          <div style={st.metaRow}>
            <span style={st.metaItem}>시행일 <em style={st.metaEm}>{EFFECTIVE}</em></span>
            <span style={st.metaDot}>·</span>
            <span style={st.metaItem}>최종 개정 <em style={st.metaEm}>{UPDATED}</em></span>
          </div>
        </header>

        <p style={st.lead}>
          DriftLog(이하 "서비스")는 이용자의 개인정보를 소중히 다루며, 「개인정보 보호법」 등
          관련 법령을 준수합니다. 본 방침은 서비스가 수집하는 정보의 항목과 이용·보관·파기에
          관한 사항을 규정합니다.
        </p>

        <Section n="01" title="수집하는 개인정보 항목">
          <p style={st.p}>서비스는 회원 가입 및 서비스 이용 과정에서 다음의 정보를 수집합니다.</p>
          <dl style={st.dl}>
            <Row term="계정 정보" desc="이메일 주소, 닉네임" />
            <Row term="소셜 로그인 식별자" desc="구글·카카오·애플 로그인 시 제공되는 고유 식별자 및 이메일" />
            <Row term="서비스 이용 기록" desc="공부 기록(과목·시간), 항해 진행 기록" />
          </dl>
          <p style={st.note}>
            서비스는 날씨 표현을 위해 위치 정보를 일시적으로 처리할 수 있으나, 이를 이용자와
            연결하여 저장하지 않습니다.
          </p>
        </Section>

        <Section n="02" title="개인정보의 수집 및 이용 목적">
          <ul style={st.ul}>
            <Li>회원 식별 및 로그인, 계정 관리</Li>
            <Li>공부·항해 기록의 저장 및 제공</Li>
            <Li>서비스 운영, 유지보수 및 이용자 문의 응대</Li>
          </ul>
        </Section>

        <Section n="03" title="개인정보의 보관 및 저장 위치">
          <p style={st.p}>
            수집된 정보는 서비스가 직접 운영하는 자체 서버(AWS 클라우드, MySQL 데이터베이스)에
            저장됩니다. 서비스는 외부 분석 도구 또는 제3자 광고·추적 서비스를 일절 사용하지
            않습니다.
          </p>
        </Section>

        <Section n="04" title="개인정보의 제3자 제공">
          <p style={st.p}>
            서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 소셜 로그인
            제공자(구글, 카카오, 애플)를 통한 인증 과정에서 해당 사업자의 정책에 따라 최소한의
            인증 정보가 처리됩니다.
          </p>
        </Section>

        <Section n="05" title="개인정보의 보유 기간 및 파기">
          <p style={st.p}>
            이용자의 개인정보는 회원 탈퇴 시 또는 수집·이용 목적이 달성된 후 지체 없이
            파기합니다. 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 분리하여 보관한 후
            파기합니다.
          </p>
        </Section>

        <Section n="06" title="이용자의 권리">
          <p style={st.p}>
            이용자는 언제든지 자신의 개인정보를 조회·수정할 수 있으며, 회원 탈퇴를 통해
            개인정보의 삭제를 요청할 수 있습니다. 권리 행사는 아래 문의처를 통해 가능합니다.
          </p>
        </Section>

        <Section n="07" title="개인정보 보호책임자 및 문의처">
          <p style={st.p}>개인정보 처리에 관한 문의·민원은 아래 연락처로 접수하실 수 있습니다.</p>
          <div style={st.contactBox}>
            <span style={st.contactLabel}>이메일</span>
            <a href={`mailto:${CONTACT}`} style={st.contactValue}>{CONTACT}</a>
          </div>
        </Section>

        <Section n="08" title="고지의 의무">
          <p style={st.p}>
            본 개인정보처리방침의 내용이 추가·삭제 또는 변경되는 경우, 개정 사항을 본 페이지를
            통해 시행일 이전에 공지합니다.
          </p>
        </Section>

        <footer style={st.footerWrap}>
          <div style={st.footerLine} />
          <div style={st.footerBrand}>DRIFTLOG</div>
          <div style={st.footerCopy}>© 2026 DriftLog. All rights reserved.</div>
        </footer>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section style={st.section}>
      <h2 style={st.h2}>
        <span style={st.num}>{n}</span>
        <span style={st.h2text}>{title}</span>
      </h2>
      <div style={st.sectionBody}>{children}</div>
    </section>
  );
}

function Row({ term, desc }: { term: string; desc: string }) {
  return (
    <div style={st.dlRow}>
      <dt style={st.dt}>{term}</dt>
      <dd style={st.dd}>{desc}</dd>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={st.li}>
      <span style={st.liMark} />
      <span style={st.liText}>{children}</span>
    </li>
  );
}

const st: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100vh", background: "#040d16", color: "#a8c4d4", padding: "0 22px", display: "flex", justifyContent: "center" },
  inner: { width: "100%", maxWidth: 720, padding: "48px 0 80px" },

  back: { color: "#3a6880", fontSize: 13, letterSpacing: 1, textDecoration: "none", fontFamily: "monospace" },

  header: { margin: "30px 0 0", paddingBottom: 30, borderBottom: "1px solid #12283a" },
  eyebrow: { color: "#3a6880", fontSize: 11, letterSpacing: 3, fontFamily: "monospace", marginBottom: 16 },
  h1: { color: "#dcecf4", fontSize: 30, fontWeight: 600, letterSpacing: 2, margin: 0 },
  metaRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 16 },
  metaItem: { color: "#4a7a94", fontSize: 12, fontFamily: "monospace", letterSpacing: 0.5 },
  metaEm: { color: "#7ea8c0", fontStyle: "normal" },
  metaDot: { color: "#1a3a50" },

  lead: { color: "#8fb4cc", fontSize: 14.5, lineHeight: 1.85, margin: "32px 0 44px", letterSpacing: 0.2 },

  section: { display: "flex", flexDirection: "column", margin: "0 0 38px" },
  h2: { display: "flex", alignItems: "center", gap: 14, margin: "0 0 16px" },
  num: { color: "#5aa3c0", fontSize: 12, fontFamily: "monospace", letterSpacing: 1, border: "1px solid #1a4a64", borderRadius: 4, padding: "4px 8px", lineHeight: 1 },
  h2text: { color: "#bfe0ec", fontSize: 17, fontWeight: 600, letterSpacing: 0.8 },
  sectionBody: { paddingLeft: 18, borderLeft: "1px solid #0f2433", marginLeft: 4 },

  p: { color: "#7ea8c0", fontSize: 14, lineHeight: 1.85, margin: "0 0 10px", letterSpacing: 0.2 },
  note: { color: "#4a7a94", fontSize: 12.5, lineHeight: 1.75, margin: "14px 0 0", paddingLeft: 12, borderLeft: "2px solid #14303f", fontStyle: "italic" },

  dl: { margin: "4px 0 0", display: "flex", flexDirection: "column", gap: 12 },
  dlRow: { display: "flex", flexDirection: "column", gap: 3 },
  dt: { color: "#a8d4e8", fontSize: 13.5, fontWeight: 600, letterSpacing: 0.5 },
  dd: { color: "#6e98b0", fontSize: 13.5, lineHeight: 1.7, margin: 0 },

  ul: { margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 },
  li: { display: "flex", alignItems: "flex-start", gap: 10 },
  liMark: { width: 5, height: 5, borderRadius: 1, background: "#4a9abb", marginTop: 8, flexShrink: 0, transform: "rotate(45deg)" },
  liText: { color: "#7ea8c0", fontSize: 14, lineHeight: 1.75, letterSpacing: 0.2 },

  contactBox: { display: "flex", alignItems: "center", gap: 14, marginTop: 12, padding: "14px 18px", border: "1px solid #12303f", borderRadius: 8, background: "#06151f" },
  contactLabel: { color: "#3a6880", fontSize: 11, letterSpacing: 2, fontFamily: "monospace" },
  contactValue: { color: "#7ec0d2", fontSize: 15, fontFamily: "monospace", textDecoration: "none", letterSpacing: 0.5 },

  footerWrap: { marginTop: 64, textAlign: "center" },
  footerLine: { height: 1, background: "#12283a", marginBottom: 28 },
  footerBrand: { color: "#2a5a74", fontSize: 13, letterSpacing: 6, fontFamily: "monospace" },
  footerCopy: { color: "#1a3a50", fontSize: 11, fontFamily: "monospace", marginTop: 12, letterSpacing: 0.5 },
};