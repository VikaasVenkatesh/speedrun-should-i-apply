"use client";
import { Document, Page, Text, View, StyleSheet, Link, pdf } from "@react-pdf/renderer";
import type { Profile, Tailored } from "@/lib/schemas";

const s = StyleSheet.create({
  page: { paddingVertical: 34, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 9.6, color: "#141414", lineHeight: 1.35 },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold", letterSpacing: -0.3 },
  contact: { marginTop: 3, color: "#555", fontSize: 9 },
  summary: { marginTop: 8, color: "#222" },
  h: { marginTop: 12, marginBottom: 4, fontSize: 8.5, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, color: "#777", textTransform: "uppercase", borderBottomWidth: 0.6, borderBottomColor: "#ddd", paddingBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  role: { fontFamily: "Helvetica-Bold" },
  meta: { color: "#666", fontSize: 9 },
  bullet: { flexDirection: "row", marginTop: 2, paddingRight: 6 },
  dot: { width: 9, color: "#999" },
  item: { marginTop: 6 },
});

export function ResumeDocument({ profile, t, email }: { profile: Profile; t: Tailored; email: string }) {
  const contact = [profile.location, email || profile.email, profile.phone, ...profile.links.map((l) => l.url)].filter(Boolean);
  return (
    <Document title={`${profile.name} - Resume`} author={profile.name}>
      <Page size="LETTER" style={s.page}>
        <Text style={s.name}>{profile.name}</Text>
        <Text style={s.contact}>{contact.join("  ·  ")}</Text>
        {t.summary ? <Text style={s.summary}>{t.summary}</Text> : null}

        <Text style={s.h}>Experience</Text>
        {t.experience.map((r, i) => (
          <View key={i} style={s.item} wrap={false}>
            <View style={s.row}>
              <Text>
                <Text style={s.role}>{r.title}</Text>
                <Text>{`, ${r.company}`}</Text>
              </Text>
              <Text style={s.meta}>{r.dates}</Text>
            </View>
            {r.bullets.map((b, j) => (
              <View key={j} style={s.bullet}>
                <Text style={s.dot}>•</Text>
                <Text style={{ flex: 1 }}>{b.text}</Text>
              </View>
            ))}
          </View>
        ))}

        {t.projects.length > 0 && <Text style={s.h}>Projects</Text>}
        {t.projects.map((p, i) => (
          <View key={i} style={s.item} wrap={false}>
            <Text>
              <Text style={s.role}>{p.name}</Text>
              {p.link ? (
                <Link src={p.link.startsWith("http") ? p.link : `https://${p.link}`} style={{ color: "#666", textDecoration: "none" }}>
                  {`  ${p.link}`}
                </Link>
              ) : null}
            </Text>
            {p.bullets.map((b, j) => (
              <View key={j} style={s.bullet}>
                <Text style={s.dot}>•</Text>
                <Text style={{ flex: 1 }}>{b.text}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={s.h}>Education</Text>
        {t.education.map((e, i) => (
          <View key={i} style={s.item}>
            <View style={s.row}>
              <Text>
                <Text style={s.role}>{e.school}</Text>
                <Text>{e.degree ? `, ${e.degree}` : ""}</Text>
              </Text>
              <Text style={s.meta}>{e.dates}</Text>
            </View>
            {e.details ? <Text style={s.meta}>{e.details}</Text> : null}
          </View>
        ))}

        <Text style={s.h}>Skills</Text>
        <Text>{t.skills.join("  ·  ")}</Text>
      </Page>
    </Document>
  );
}

export async function renderResumeBlob(profile: Profile, t: Tailored, email: string) {
  return pdf(<ResumeDocument profile={profile} t={t} email={email} />).toBlob();
}
