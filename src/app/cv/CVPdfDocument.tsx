import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { CVData } from "@/lib/cv";

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 44,
    paddingHorizontal: 50,
    backgroundColor: "#ffffff",
    color: "#111111",
    fontFamily: "Helvetica",
    fontSize: 9.2,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: "#111111",
  },
  name: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: "center",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  role: {
    fontSize: 11,
    textAlign: "center",
    color: "#333333",
    marginBottom: 6,
  },
  contactLine: {
    fontSize: 8.5,
    color: "#333333",
    textAlign: "center",
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 4,
    letterSpacing: 0.8,
  },
  sectionRule: {
    height: 0.75,
    backgroundColor: "#111111",
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 9.2,
    lineHeight: 1.38,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  rowLeft: {
    flex: 1,
  },
  itemBlock: {
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 9.5,
    fontWeight: 700,
  },
  itemMeta: {
    fontSize: 8.5,
    color: "#333333",
  },
  itemDesc: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 1.34,
  },
  smallMeta: {
    marginTop: 2,
    fontSize: 8,
    color: "#444444",
  },
  footer: {
    marginTop: 12,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#999999",
  },
  footerText: {
    textAlign: "center",
    fontSize: 8,
    color: "#666666",
  },
  link: {
    color: "#111111",
    textDecoration: "none",
  },
});

type Props = {
  cv: CVData;
};

function SectionHeader({ title }: { title: string }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

export default function CVPdfDocument({ cv }: Props) {
  const contactLine = [
    cv.basics.locationLong,
    cv.basics.email,
    cv.basics.website,
    cv.basics.linkedin,
    cv.basics.github,
  ].join(" • ");

  return (
    <Document
      title={`${cv.basics.name} CV`}
      author={cv.basics.name}
      subject={`${cv.basics.role} Resume`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{cv.basics.name}</Text>
          <Text style={styles.role}>{cv.basics.role}</Text>
          <Text style={styles.contactLine}>{contactLine}</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader title="SUMMARY" />
          <Text style={styles.paragraph}>{cv.basics.printSummary}</Text>
        </View>

        <View style={styles.section}>
          <SectionHeader title="EXPERIENCE" />
          {cv.experience.map((item) => (
            <View key={`${item.company}-${item.period}`} style={styles.itemBlock} wrap={false}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.itemTitle}>{item.role}</Text>
                </View>
                <Text style={styles.itemMeta}>{item.period}</Text>
              </View>
              <Text style={styles.itemMeta}>{item.company} - {item.location}</Text>
              <Text style={styles.itemDesc}>{item.description}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader title="PROJECTS" />
          {cv.projects.map((project) => (
            <View key={`${project.title}-${project.period}`} style={styles.itemBlock} wrap={false}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.itemTitle}>{project.title}</Text>
                </View>
                <Text style={styles.itemMeta}>{project.period}</Text>
              </View>
              <Text style={styles.itemDesc}>{project.description}</Text>
              <Text style={styles.smallMeta}>{project.tags.join(" • ")}</Text>
              {project.links.length > 0 ? (
                <Text style={styles.smallMeta}>
                  Links:{" "}
                  {project.links.map((link, index) => (
                    <Text key={`${project.title}-${link.label}`}>
                      <Link src={link.url} style={styles.link}>{link.label}</Link>
                      {index < project.links.length - 1 ? ", " : ""}
                    </Text>
                  ))}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader title="EDUCATION" />
          {cv.education.map((item) => (
            <View key={`${item.degree}-${item.period}`} style={styles.itemBlock} wrap={false}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.itemTitle}>{item.degree}</Text>
                </View>
                <Text style={styles.itemMeta}>{item.period}</Text>
              </View>
              <Text style={styles.itemMeta}>{item.school}</Text>
              {item.gpa ? <Text style={styles.smallMeta}>GPA: {item.gpa}</Text> : null}
              {item.note ? <Text style={styles.smallMeta}>{item.note}</Text> : null}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader title="SKILLS" />
          {Object.entries(cv.skills).map(([label, values]) => (
            <Text key={label} style={styles.paragraph}>
              <Text style={styles.itemTitle}>{label}: </Text>
              {values.join(", ")}
            </Text>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{cv.basics.footerNote}</Text>
        </View>
      </Page>
    </Document>
  );
}
