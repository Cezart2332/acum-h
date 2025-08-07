import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import {
  getShadow,
  hapticFeedback,
  TYPOGRAPHY,
  getResponsiveSpacing,
  SCREEN_DIMENSIONS,
  SPACING,
} from "../utils/responsive";

type TermsAndConditionsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "TermsAndConditions"
>;

type Props = {
  navigation: TermsAndConditionsNavigationProp;
};

export default function TermsAndConditionsScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoBack = () => {
    hapticFeedback("light");
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <LinearGradient
        colors={["#000000", "#1a0d2e", "#0f0615"]}
        style={styles.gradient}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#C4B5FD" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Termeni și Condiții</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Content */}
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.introText}>
                Pagina de Termeni și Condiții definește regulile, drepturile și
                responsabilitățile utilizatorilor atunci când utilizează
                serviciul nostru. Utilizarea aplicației noastre este permisă
                numai după acceptarea acestor termeni, iar orice navigare sau
                interacțiune ulterioară cu aplicația presupune acordul
                utilizatorului cu condițiile de mai jos. Prin urmare, vă rugăm
                să citiți cu atenție acest document înainte de a folosi
                aplicația. Dacă nu sunteți de acord cu acești termeni, vă rugăm
                să nu utilizați aplicația.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                1. Definiții și Informații generale
              </Text>
              <Text style={styles.sectionText}>
                Termenul "Aplicație" se referă la platforma software furnizată
                de noi (denumită în continuare „Operator" sau „Noi").
                „Utilizatorul" (sau „Tu") este persoana fizică care descarcă,
                accesează sau utilizează aplicația. Pentru orice informații
                oficiale sau întrebări legate de acești termeni, vei putea să ne
                contactezi prin secțiunea de suport disponibilă în aplicație sau
                la adresa de e-mail comunicată în aplicație.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                2. Descrierea Serviciului și Funcționalități
              </Text>
              <Text style={styles.sectionText}>
                Aplicația noastră furnizează utilizatorilor servicii și
                funcționalități diverse, inclusiv:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletText}>
                  • Recomandări AI: oferim sugestii și conținut personalizat pe
                  baza preferințelor și comportamentului tău.
                </Text>
                <Text style={styles.bulletText}>
                  • Rezervări: poți realiza rezervări de servicii/produs prin
                  aplicație, dacă această facilitate este disponibilă.
                </Text>
                <Text style={styles.bulletText}>
                  • Funcționalitatea de bază: include crearea contului de
                  utilizator, autentificarea și navigarea prin interfața
                  aplicației pentru scopul declarat.
                </Text>
                <Text style={styles.bulletText}>
                  • Îmbunătățirea produsului și dezvoltare: analizăm feedback-ul
                  și datele de utilizare pentru a optimiza și extinde serviciile
                  oferite.
                </Text>
                <Text style={styles.bulletText}>
                  • Securitate și prevenirea fraudelor: monitorizăm activitățile
                  din aplicație pentru a identifica și preveni comportamente
                  neautorizate sau frauduloase.
                </Text>
              </View>
              <Text style={styles.sectionText}>
                Operatorul nu garantează că aplicația va fi disponibilă
                neîntrerupt sau complet lipsită de erori; utilizarea ei se face
                "așa cum este", la riscul propriu al utilizatorului.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                3. Crearea Contului și Accesul în Aplicație
              </Text>
              <Text style={styles.sectionText}>
                Pentru a accesa serviciile oferite, utilizatorii trebuie să își
                creeze un cont. Contul poate fi creat prin:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletText}>
                  • Email și parolă – furnizând o adresă de email validă și
                  alegând o parolă personală.
                </Text>
                <Text style={styles.bulletText}>
                  • Autentificare terță parte – folosind contul de Google sau
                  Facebook.
                </Text>
              </View>
              <Text style={styles.highlightText}>
                Limitarea de vârstă: Aplicația nu este destinată minorilor sub
                16 ani. Nu colectăm și nu prelucrăm date ale persoanelor sub 16
                ani. Prin crearea unui cont și furnizarea datelor personale,
                declari că ai cel puțin 16 ani.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Activități Interzise</Text>
              <Text style={styles.sectionText}>
                Orice utilizare a aplicației în scopuri ilegale sau
                neautorizate este strict interzisă. Activitățile interzise
                includ:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletText}>
                  • Realizarea de activități infracționale prin intermediul
                  aplicației
                </Text>
                <Text style={styles.bulletText}>
                  • Răspândirea de conținut obscene, ilegale sau ofensatoare
                </Text>
                <Text style={styles.bulletText}>
                  • Accesarea neautorizată a datelor din aplicație
                </Text>
                <Text style={styles.bulletText}>
                  • Utilizarea scripturilor automatizate pentru colectarea
                  datelor
                </Text>
                <Text style={styles.bulletText}>
                  • Crearea de conturi cu date aparținând altor persoane
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                5. Drepturi de Proprietate Intelectuală
              </Text>
              <Text style={styles.sectionText}>
                Conținutul aplicației noastre – inclusiv software-ul, interfața
                grafică, logo-urile, textele și imaginile – este protejat prin
                drepturi de autor și alte legi privind proprietatea
                intelectuală. Este interzisă copierea, reproducerea,
                distribuirea sau oricare altă folosire neautorizată a acestui
                conținut fără acordul scris prealabil al operatorului.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Limitarea Răspunderii</Text>
              <Text style={styles.sectionText}>
                În măsura permisă de lege, operatorul nu va fi responsabil
                pentru nicio pagubă (directă, indirectă sau de alt tip)
                rezultată din utilizarea aplicației. Aplicația este oferită „așa
                cum este", fără garanții de vreo natură.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                7. Modificări ale Termenilor
              </Text>
              <Text style={styles.sectionText}>
                Ne rezervăm dreptul de a modifica în orice moment acești Termeni
                și Condiții. Orice schimbare va fi pusă la dispoziție în
                aplicație, împreună cu data ultimei actualizări.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                8. Legea aplicabilă și Soluționarea Litigiilor
              </Text>
              <Text style={styles.sectionText}>
                Acești Termeni sunt guvernați de legislația din România. Orice
                dispută născută din acești termeni va fi soluționată pe cale
                amiabilă sau, dacă este necesar, de instanțele judecătorești
                competente din România.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionMainTitle}>
                Politica de Confidențialitate și GDPR
              </Text>
              <Text style={styles.sectionText}>
                Considerăm protecția datelor personale a utilizatorilor noștri
                un angajament fundamental. Prelucrarea datelor cu caracter
                personal se face conform Regulamentului (UE) 2016/679 (GDPR) și
                legislației naționale aferente, în mod legal și transparent.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                1. Categorii de date colectate
              </Text>
              <Text style={styles.sectionText}>
                Colectăm următoarele date cu caracter personal:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletText}>• Nume și prenume</Text>
                <Text style={styles.bulletText}>• Adresă de e-mail</Text>
                <Text style={styles.bulletText}>
                  • Parolă (stocată criptat pentru autentificare)
                </Text>
                <Text style={styles.bulletText}>
                  • Locație (dacă activezi serviciile care solicită aceasta)
                </Text>
                <Text style={styles.bulletText}>
                  • Adresă IP (înregistrată automat la accesarea aplicației)
                </Text>
                <Text style={styles.bulletText}>
                  • Obiceiuri de consum și preferințe
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                2. Scopurile prelucrării datelor
              </Text>
              <Text style={styles.sectionText}>
                Datele tale sunt prelucrate în următoarele scopuri:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletText}>
                  • Furnizarea funcționalităților aplicației
                </Text>
                <Text style={styles.bulletText}>
                  • Recomandări AI și personalizare
                </Text>
                <Text style={styles.bulletText}>
                  • Îmbunătățirea produsului și dezvoltare
                </Text>
                <Text style={styles.bulletText}>
                  • Marketing și publicitate (cu acordul tău)
                </Text>
                <Text style={styles.bulletText}>
                  • Securitate și prevenirea fraudelor
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Securitatea datelor</Text>
              <Text style={styles.sectionText}>
                Implementăm măsuri tehnice și organizatorice adecvate pentru a
                proteja datele personale împotriva accesului neautorizat,
                pierderii sau distrugerii accidentale, incluzând criptarea
                parolelor, protecție SSL și control al accesului la servere.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                4. Drepturile persoanelor vizate
              </Text>
              <Text style={styles.sectionText}>
                Conform GDPR, ai următoarele drepturi:
              </Text>
              <View style={styles.bulletList}>
                <Text style={styles.bulletText}>• Dreptul de acces</Text>
                <Text style={styles.bulletText}>• Dreptul de rectificare</Text>
                <Text style={styles.bulletText}>
                  • Dreptul la ștergere („dreptul de a fi uitat")
                </Text>
                <Text style={styles.bulletText}>
                  • Dreptul de restricționare a prelucrării
                </Text>
                <Text style={styles.bulletText}>• Dreptul de portabilitate</Text>
                <Text style={styles.bulletText}>• Dreptul la opoziție</Text>
                <Text style={styles.bulletText}>
                  • Dreptul de a retrage consimțământul
                </Text>
                <Text style={styles.bulletText}>
                  • Dreptul de a depune plângere
                </Text>
              </View>
            </View>

            <View style={[styles.section, styles.lastSection]}>
              <Text style={styles.sectionTitle}>5. Contact</Text>
              <Text style={styles.sectionText}>
                Pentru întrebări, clarificări sau pentru a-ți exercita
                drepturile, ne poți scrie la adresa de email comunicată în
                aplicație. Ne angajăm să actualizăm periodic această Politică de
                Confidențialitate pentru a reflecta orice modificare legislativă
                sau în practica noastră de prelucrare.
              </Text>
              <Text style={styles.lastUpdateText}>
                Ultima actualizare: August 2025
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: getResponsiveSpacing("lg"),
    paddingVertical: getResponsiveSpacing("md"),
    backgroundColor: "rgba(26, 13, 46, 0.8)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(196, 181, 253, 0.2)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(196, 181, 253, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    ...getShadow(2),
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h3,
    color: "#FFFFFF",
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: getResponsiveSpacing("lg"),
    paddingVertical: getResponsiveSpacing("lg"),
  },
  section: {
    marginBottom: getResponsiveSpacing("xl"),
  },
  lastSection: {
    marginBottom: SPACING.xxxl,
  },
  introText: {
    fontSize: TYPOGRAPHY.body,
    color: "#E5E7EB",
    lineHeight: 24,
    textAlign: "justify",
  },
  sectionMainTitle: {
    fontSize: TYPOGRAPHY.h2,
    color: "#C4B5FD",
    fontWeight: "700",
    marginBottom: getResponsiveSpacing("sm"),
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.h4,
    color: "#C4B5FD",
    fontWeight: "600",
    marginBottom: getResponsiveSpacing("sm"),
  },
  sectionText: {
    fontSize: TYPOGRAPHY.body,
    color: "#E5E7EB",
    lineHeight: 22,
    textAlign: "justify",
  },
  bulletList: {
    marginVertical: getResponsiveSpacing("sm"),
    paddingLeft: getResponsiveSpacing("xs"),
  },
  bulletText: {
    fontSize: TYPOGRAPHY.body,
    color: "#D1D5DB",
    lineHeight: 22,
    marginBottom: getResponsiveSpacing("xs"),
    textAlign: "justify",
  },
  highlightText: {
    fontSize: TYPOGRAPHY.body,
    color: "#F3E8FF",
    lineHeight: 22,
    textAlign: "justify",
    backgroundColor: "rgba(124, 58, 237, 0.1)",
    padding: getResponsiveSpacing("sm"),
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#C4B5FD",
    marginTop: getResponsiveSpacing("sm"),
  },
  lastUpdateText: {
    fontSize: TYPOGRAPHY.caption,
    color: "#9CA3AF",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: getResponsiveSpacing("md"),
  },
});
