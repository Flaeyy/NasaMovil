import { useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getPost } from '../lib/api';


type Post = { id: number; title: string; body: string };


export default function Details() {
const { id } = useLocalSearchParams<{ id: string }>();
const [post, setPost] = useState<Post | null>(null);
const [error, setError] = useState<string | null>(null);


useEffect(() => {
(async () => {
try {
setError(null);
const p = await getPost(String(id));
setPost(p);
} catch (e: any) {
setError(e.message ?? 'Error');
}
})();
}, [id]);


if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
if (!post) return <View style={styles.center}><ActivityIndicator size="large" /></View>;


return (
<View style={styles.container}>
<Stack.Screen options={{ title: `Post #${post.id}` }} />
<Text style={styles.title}>{post.title}</Text>
<Text style={styles.body}>{post.body}</Text>
</View>
);
}


const styles = StyleSheet.create({
container: { flex: 1, padding: 16 },
center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
body: { fontSize: 16, lineHeight: 22 },
error: { color: '#ef4444' }
});