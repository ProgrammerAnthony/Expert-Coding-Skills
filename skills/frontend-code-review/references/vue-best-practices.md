# Vue 开发最佳实践

## Composition API 规范

### 基础结构
```vue
<script setup lang="ts">
// 1. 导入（外部库 → 内部模块 → 类型）
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import type { User } from '@/types'

// 2. Props & Emits 定义
const props = defineProps<{
  userId: string
  initialName?: string
}>()

const emit = defineEmits<{
  update: [user: User]
  delete: [id: string]
}>()

// 3. 响应式状态
const name = ref(props.initialName ?? '')
const isLoading = ref(false)

// 4. 计算属性
const displayName = computed(() => name.value.trim() || '未命名')

// 5. 组合式函数（Composables）
const { user, fetchUser } = useUserStore()

// 6. 方法
async function handleSave() {
  isLoading.value = true
  try {
    const updated = await api.updateUser(props.userId, { name: name.value })
    emit('update', updated)
  } finally {
    isLoading.value = false
  }
}

// 7. 生命周期
onMounted(() => {
  fetchUser(props.userId)
})
</script>
```

---

## 响应式数据规范

```ts
// ref：基础类型、需要在 template 外部访问时使用
const count = ref(0)
const message = ref('')
const user = ref<User | null>(null)

// reactive：复杂对象，在 script 内大量使用时更简洁
const form = reactive({
  name: '',
  email: '',
  age: 0,
})

// 注意：不要对 reactive 对象解构，会丢失响应性
const { name } = form  // 错误！name 不再是响应式的
const { name } = toRefs(form)  // 正确：使用 toRefs 保持响应性

// computed 的正确使用
const fullName = computed(() => `${firstName.value} ${lastName.value}`)

// 可写的 computed
const modelValue = computed({
  get: () => props.value,
  set: (val) => emit('update:value', val),
})
```

---

## watch 使用规范

```ts
// watch vs watchEffect vs computed 选择

// computed：有返回值，用于模板展示或派生数据
const total = computed(() => items.value.reduce((s, i) => s + i.price, 0))

// watchEffect：立即执行，自动收集依赖（副作用场景）
watchEffect(() => {
  document.title = `${pageTitle.value} - MyApp`
})

// watch：精确控制，监听特定数据变化
watch(userId, async (newId, oldId) => {
  if (newId !== oldId) {
    await fetchUser(newId)
  }
}, { immediate: true })  // immediate: true 替代 onMounted + watch

// 监听对象深层变化（慎用，性能开销大）
watch(() => user.value, (newUser) => {
  console.log('user changed:', newUser)
}, { deep: true })

// 推荐：监听具体的属性而非整个对象
watch(() => user.value?.name, (newName) => {
  updateTitle(newName)
})
```

---

## 组件通信规范

```ts
// 1. Props & Emits（父子组件）
const props = defineProps<{ count: number }>()
const emit = defineEmits<{ increment: [] }>()

// 2. v-model（双向绑定）
// 父组件：<Counter v-model:count="count" />
const props = defineProps<{ count: number }>()
const emit = defineEmits<{ 'update:count': [value: number] }>()

// 3. provide / inject（跨层级，替代 props drilling）
// 祖先组件
provide('theme', readonly(theme))

// 后代组件
const theme = inject<Ref<'light' | 'dark'>>('theme')

// 4. Pinia（全局状态）
const userStore = useUserStore()
```

---

## Pinia 最佳实践

```ts
// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', () => {
  // state
  const user = ref<User | null>(null)
  const isLoading = ref(false)

  // getters（computed）
  const isLoggedIn = computed(() => !!user.value)
  const displayName = computed(() => user.value?.name ?? '游客')

  // actions
  async function fetchUser(id: string) {
    isLoading.value = true
    try {
      user.value = await api.getUser(id)
    } finally {
      isLoading.value = false
    }
  }

  function logout() {
    user.value = null
  }

  return { user, isLoading, isLoggedIn, displayName, fetchUser, logout }
})
```

---

## 模板规范

```vue
<template>
  <!-- v-if vs v-show -->
  <!-- v-if：条件不常变化（切换时销毁/创建组件） -->
  <ExpensiveComponent v-if="isVisible" />

  <!-- v-show：条件频繁切换（只切换 display） -->
  <Tooltip v-show="isHovered" />

  <!-- v-for 必须绑定 key -->
  <li v-for="item in list" :key="item.id">{{ item.name }}</li>

  <!-- v-for 和 v-if 不要在同一元素（Vue 3 v-if 优先级高于 v-for） -->
  <!-- 不推荐 -->
  <li v-for="item in list" v-if="item.isActive" :key="item.id" />

  <!-- 推荐：用 computed 过滤数据 -->
  <li v-for="item in activeItems" :key="item.id" />
</template>

<script setup lang="ts">
const activeItems = computed(() => list.value.filter(item => item.isActive))
</script>
```

---

## Composables（组合式函数）规范

```ts
// composables/useAsync.ts
// 命名：use 开头，描述功能
export function useAsync<T>(asyncFn: () => Promise<T>) {
  const data = ref<T | null>(null)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  async function execute() {
    isLoading.value = true
    error.value = null
    try {
      data.value = await asyncFn()
    } catch (e) {
      error.value = e as Error
    } finally {
      isLoading.value = false
    }
  }

  return { data, isLoading, error, execute }
}

// 使用
const { data: users, isLoading, execute: fetchUsers } = useAsync(api.getUsers)
onMounted(fetchUsers)
```
