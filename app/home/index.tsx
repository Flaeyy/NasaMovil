// app/home/index.tsx - Home screen moved here for cleaner structure
import { ImageBackground, Image, ScrollView, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { GetStatus } from '../services/nasaServices';

const HERO = require('../../assets/image1.jpg');
const NASA = require('../../assets/image2.jpg');

export default function Home() {
  const router = useRouter();

  const onStart = useCallback(() => {
    router.push('/consulta');
  }, [router]);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const status = await GetStatus();
        if (mounted) console.log('NASA Status:', status);
      } catch (err) {
        console.error('Error fetching NASA status:', err);
      }
    };
    fetchStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const methodology = [
    {
      title: 'Ventanas Temporales',
      emoji: '📅',
      body: 'Extraemos una ventana de días (ej: ±3) de cada año histórico (típicamente 15 años) para construir el histórico.'
    },
    {
      title: 'Variables Indicadoras',
      emoji: '🔢',
      body: 'Cada condición se transforma en una variable binaria (1 si cumple, 0 si no cumple).'
    },
    {
      title: 'Probabilidad Empírica',
      emoji: '📊',
      body: 'Calculamos la frecuencia relativa de días que cumplieron la condición en el histórico analizado.'
    },
    {
      title: 'Suavizado Bayesiano',
      emoji: '🎯',
      body: 'Aplicamos Beta-Binomial con la priori de Jeffreys para evitar extremos con muestras pequeñas.'
    },
    {
      title: 'Intervalos de Confianza',
      emoji: '📈',
      body: 'Cuantificamos la incertidumbre usando intervalos bayesianos y el método de Wilson (95%).'
    },
    {
      title: 'Interpretación',
      emoji: 'ℹ️',
      body: 'Presentamos métricas que balancean simplicidad frecuentista y robustez bayesiana.'
    }
  ];

  const team = [
    { name: 'Eduardo Castro', photo: null },
    { name: 'Felix Dolores', photo: null },
    { name: 'Wendolyne Lambur', photo: null },
    { name: 'Fernanda Merino', photo: null },
    { name: 'Fernanda Medrano', photo: null },
    { name: 'Gerardo Yepez', photo: null }
  ];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.wrapper} contentContainerStyle={styles.content}>
      <ImageBackground source={HERO} style={styles.hero} resizeMode="cover">
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>Que es Tempo?</Text>
          <Text style={styles.heroText}>
            Tempo es una plataforma que combina datos históricos y satelitales para generar probabilidades
            climáticas y visualizaciones interactivas. Provee herramientas para tomar decisiones basadas en
            análisis meteorológicos robustos.
          </Text>
          <TouchableOpacity style={styles.heroBtn} onPress={onStart}>
            <Text style={styles.heroBtnText}>Iniciar</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      <View style={styles.container}>
        <View style={styles.featureCard}>
          <Image source={NASA} style={styles.featureImage} resizeMode="cover" />
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Fuente de Datos: NASA POWER API</Text>
            <Text style={styles.featureBody}>
              Utilizamos la NASA POWER API, que proporciona datos meteorológicos globales de alta calidad recopilados
              por satélites y validados por estaciones terrestres. Esto garantiza precisión y cobertura mundial.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>¿Cómo Calculamos las Probabilidades?</Text>
        <Text style={styles.sectionIntro}>
          Nuestro sistema combina datos históricos de NASA POWER con métodos estadísticos avanzados para proporcionar
          predicciones climáticas precisas y confiables.
        </Text>

        <View style={styles.cardsWrap}>
          {methodology.map((m, i) => (
            <View key={i} style={styles.cardSmall}>
              <Text style={styles.cardEmoji}>{m.emoji}</Text>
              <Text style={styles.cardSmallTitle}>{m.title}</Text>
              <Text style={styles.cardSmallBody}>{m.body}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Nuestro Equipo</Text>
        <View style={styles.teamWrap}>
          {team.map((member, idx) => (
            <View key={idx} style={styles.teamMember}>
              {member.photo ? (
                <Image source={member.photo} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{member.name.split(' ').map(n => n[0]).join('')}</Text>
                </View>
              )}
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>Team Yuppi</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Sobre Tempo</Text>
          <Text style={styles.footerText}>
            Plataforma de análisis climático basada en datos históricos de NASA POWER, diseñada para proporcionar
            predicciones confiables y toma de decisiones informadas.
          </Text>
          <Text style={styles.copy}>© {new Date().getFullYear()} Tempo - Team Yuppi. Datos: NASA POWER.</Text>
        </View>
      </View>
      </ScrollView>

      {/* Bottom tab bar - mobile navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/')}>
          <Text style={styles.tabText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/consulta')}>
          <Text style={styles.tabTextActive}>Consultar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => router.push('/peticiones')}>
          <Text style={styles.tabText}>Peticiones</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#ffffff' },
  content: { flexGrow: 1 },
  hero: { width: '100%', height: 280, justifyContent: 'center' },
  heroOverlay: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 10,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', marginBottom: 8, color: '#0B3D91' },
  heroText: { fontSize: 14, color: '#0f172a', lineHeight: 20 },
  heroBtn: {
    marginTop: 12,
    backgroundColor: '#0B856E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  heroBtnText: { color: '#fff', fontWeight: '700' },

  container: { maxWidth: 900, alignSelf: 'center', width: '100%', padding: 16 },
  featureCard: {
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  featureImage: { width: 120, height: 120, borderRadius: 10 },
  featureText: { flex: 1, paddingLeft: 6 },
  featureTitle: { fontSize: 18, fontWeight: '700', color: '#0B3D91', marginBottom: 6 },
  featureBody: { fontSize: 14, color: '#334155', lineHeight: 20 },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0B3D91', marginTop: 20, textAlign: 'center' },
  sectionIntro: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, marginBottom: 12 },

  cardsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  cardSmall: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e6eef9',
  },
  cardEmoji: { fontSize: 28, marginBottom: 8 },
  cardSmallTitle: { fontSize: 16, fontWeight: '700', color: '#0B3D91', marginBottom: 6 },
  cardSmallBody: { fontSize: 13, color: '#374151' },

  teamWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12 },
  teamMember: { width: '48%', alignItems: 'center', marginBottom: 12, backgroundColor: '#fff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#eef2ff' },
  avatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 8 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, marginBottom: 8, backgroundColor: '#60a5fa', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontWeight: '700' },
  memberName: { fontWeight: '700', color: '#0f172a' },
  memberRole: { fontSize: 12, color: '#6b7280' },

  footer: { marginTop: 20, padding: 12, backgroundColor: '#f1fdf7', borderRadius: 10 },
  footerTitle: { fontSize: 16, fontWeight: '800', color: '#0B3D91', marginBottom: 6 },
  footerText: { fontSize: 13, color: '#475569', marginBottom: 8 },
  copy: { fontSize: 12, color: '#6b7280', textAlign: 'center' }
  ,
  tabBar: {
    height: 64,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around'
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: '#374151' },
  tabTextActive: { color: '#0B3D91', fontWeight: '700' }
});
