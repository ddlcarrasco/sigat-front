<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const username = ref('')
const password = ref('')
const error    = ref('')
const cargando = ref(false)

const router    = useRouter()
const authStore = useAuthStore()

async function iniciarSesion() {
    error.value    = ''
    cargando.value = true
    try {
        await authStore.login(username.value, password.value)
        router.push('/titulares')
    } catch (e) {
        error.value = 'Usuario o contraseña incorrectos'
    } finally {
        cargando.value = false
    }
}
</script>

<template>
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <h1>SIGAT</h1>
                <p>Sistema de Gestión de Agua Potable</p>
            </div>

            <div class="login-form">
                <div class="campo">
                    <label for="username">Usuario</label>
                    <InputText
                        id="username"
                        v-model="username"
                        placeholder="Ingresa tu usuario"
                        class="w-full"
                        @keyup.enter="iniciarSesion"
                    />
                </div>

                <div class="campo">
                    <label for="password">Contraseña</label>
                    <Password
                        id="password"
                        v-model="password"
                        placeholder="Ingresa tu contraseña"
                        :feedback="false"
                        toggleMask
                        class="w-full"
                        @keyup.enter="iniciarSesion"
                    />
                </div>

                <Message v-if="error" severity="error" :closable="false">
                    {{ error }}
                </Message>

                <Button
                    label="Entrar"
                    icon="pi pi-sign-in"
                    class="w-full"
                    :loading="cargando"
                    @click="iniciarSesion"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f0f2f5;
}

.login-card {
    background: white;
    border-radius: 12px;
    padding: 2.5rem;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}

.login-header {
    text-align: center;
    margin-bottom: 2rem;
}

.login-header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1a5276;
    margin: 0;
}

.login-header p {
    color: #6c757d;
    margin-top: 0.25rem;
}

.login-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.campo {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.campo label {
    font-weight: 600;
    color: #374151;
    font-size: 0.9rem;
}
</style>
