<template>
  <div class="about-page max-w-4xl mx-auto">

    <!-- Hero -->
    <div class="mb-12 text-center py-10 px-6 rounded-2xl bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border border-primary-100 dark:border-primary-800">
      <div class="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
        <RectangleGroupIcon class="w-9 h-9 text-white" />
      </div>
      <h1 class="text-4xl font-bold mb-3">Scrum Board</h1>
      <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
        Moderní webová aplikace pro agilní řízení projektů, navržená pro týmy, které chtějí pracovat efektivně a přehledně.
      </p>
      <div class="flex items-center justify-center gap-2 mt-4">
        <UBadge color="green" variant="soft">v1.0</UBadge>
        <UBadge color="blue" variant="soft">Aktivně vyvíjeno</UBadge>
        <UBadge color="gray" variant="soft">Open source</UBadge>
      </div>
    </div>

    <!-- Co je Scrum Board -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold mb-4">Co je Scrum Board?</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
          <p>
            Scrum Board je webová aplikace pro správu projektů a úkolů, inspirovaná metodikou Scrum a principy agilního vývoje. Umožňuje týmům organizovat práci do sprintů, sledovat postup pomocí Kanban tabule a měřit výkonnost přes přehledné reporty.
          </p>
          <p>
            Aplikace vznikla jako bakalářská práce na Fakultě informatiky a managementu Univerzity Hradec Králové. Jejím cílem je demonstrovat možnosti moderních webových technologií při tvorbě real-time kolaborativních nástrojů.
          </p>
        </div>
        <UCard class="bg-gray-50 dark:bg-gray-900/50">
          <div class="space-y-3">
            <div v-for="fact in keyFacts" :key="fact.label" class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" :class="fact.bg">
                <component :is="fact.icon" class="w-4 h-4" :class="fact.color" />
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ fact.label }}</p>
                <p class="font-semibold text-sm">{{ fact.value }}</p>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </section>

    <!-- Klíčové funkce -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold mb-6">Klíčové funkce</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UCard v-for="feature in features" :key="feature.title" class="hover:shadow-md transition-shadow">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="feature.bg">
              <component :is="feature.icon" class="w-5 h-5" :class="feature.color" />
            </div>
            <div>
              <h3 class="font-semibold mb-1">{{ feature.title }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{{ feature.desc }}</p>
            </div>
          </div>
        </UCard>
      </div>
    </section>

    <!-- Technologie -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold mb-6">Technologie</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <UCard
          v-for="tech in techStack"
          :key="tech.name"
          class="text-center hover:shadow-md transition-shadow"
        >
          <div class="py-2">
            <div class="text-3xl mb-2">{{ tech.emoji }}</div>
            <p class="font-semibold text-sm">{{ tech.name }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ tech.role }}</p>
          </div>
        </UCard>
      </div>
    </section>

    <!-- Jak to funguje -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold mb-6">Jak aplikace funguje</h2>
      <div class="relative">
        <div class="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 hidden md:block"></div>
        <div class="space-y-6">
          <div v-for="(step, idx) in howItWorks" :key="idx" class="flex items-start gap-4 md:gap-6">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-white z-10" :class="step.bg">
              {{ idx + 1 }}
            </div>
            <UCard class="flex-1 hover:shadow-md transition-shadow">
              <h3 class="font-semibold mb-1">{{ step.title }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ step.desc }}</p>
            </UCard>
          </div>
        </div>
      </div>
    </section>

    <!-- Srovnání s konkurencí -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold mb-2">Srovnání s podobnými nástroji</h2>
      <p class="text-gray-500 text-sm mb-6">Scrum Board se zaměřuje na jednoduchost a přehlednost pro malé až střední týmy.</p>
      <UCard>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="text-left py-3 pr-4 font-semibold text-gray-700 dark:text-gray-300">Funkce</th>
                <th class="text-center py-3 px-3 font-semibold text-primary-600">Scrum Board</th>
                <th class="text-center py-3 px-3 font-semibold text-gray-500">Trello</th>
                <th class="text-center py-3 px-3 font-semibold text-gray-500">Jira</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-for="row in comparisonRows" :key="row.feature" class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td class="py-3 pr-4 font-medium">{{ row.feature }}</td>
                <td class="py-3 px-3 text-center">
                  <span v-if="row.us === true" class="text-green-500">✓</span>
                  <span v-else-if="row.us === false" class="text-gray-300">—</span>
                  <span v-else class="text-xs text-gray-600 dark:text-gray-400">{{ row.us }}</span>
                </td>
                <td class="py-3 px-3 text-center">
                  <span v-if="row.trello === true" class="text-green-500">✓</span>
                  <span v-else-if="row.trello === false" class="text-gray-300">—</span>
                  <span v-else class="text-xs text-gray-600 dark:text-gray-400">{{ row.trello }}</span>
                </td>
                <td class="py-3 px-3 text-center">
                  <span v-if="row.jira === true" class="text-green-500">✓</span>
                  <span v-else-if="row.jira === false" class="text-gray-300">—</span>
                  <span v-else class="text-xs text-gray-600 dark:text-gray-400">{{ row.jira }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </section>

    <!-- Autor -->
    <section class="mb-12">
      <h2 class="text-2xl font-bold mb-6">O autorovi</h2>
      <UCard>
        <div class="flex items-start gap-6">
          <div class="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            ML
          </div>
          <div>
            <h3 class="text-xl font-semibold">Mykhailo Levurda</h3>
            <p class="text-gray-500 text-sm mt-1">Student bakalářského programu — Aplikovaná informatika</p>
            <p class="text-gray-500 text-sm">Fakulta informatiky a managementu, Univerzita Hradec Králové</p>
            <div class="flex flex-wrap gap-2 mt-4">
              <UBadge color="blue" variant="soft">Vue 3</UBadge>
              <UBadge color="orange" variant="soft">Nuxt 3</UBadge>
              <UBadge color="yellow" variant="soft">Firebase</UBadge>
              <UBadge color="green" variant="soft">TypeScript</UBadge>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-4 leading-relaxed">
              Aplikace Scrum Board vznikla jako praktická část bakalářské práce, jejímž cílem je navrhnout a implementovat plnohodnotný nástroj pro agilní řízení projektů s využitím moderních webových technologií a cloudové infrastruktury.
            </p>
          </div>
        </div>
      </UCard>
    </section>

    <!-- CTA -->
    <div class="text-center py-8 border-t border-gray-200 dark:border-gray-800">
      <p class="text-gray-500 mb-4">Máte otázky k používání aplikace?</p>
      <NuxtLink to="/support">
        <UButton icon="i-heroicons-question-mark-circle" variant="soft">
          Centrum podpory
        </UButton>
      </NuxtLink>
    </div>

  </div>
</template>

<script setup lang="ts">
import {
  RectangleGroupIcon,
  FolderIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  BellIcon,
  ShieldCheckIcon,
  TagIcon,
  PaperClipIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
} from '@heroicons/vue/24/outline'

const keyFacts = [
  { label: 'Typ aplikace', value: 'Single Page Application (SPA/SSR)', icon: GlobeAltIcon, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600' },
  { label: 'Akademický kontext', value: 'Bakalářská práce 2024/2025', icon: AcademicCapIcon, bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-600' },
  { label: 'Metodika', value: 'Scrum / Agilní vývoj', icon: CalendarDaysIcon, bg: 'bg-green-100 dark:bg-green-900/30', color: 'text-green-600' },
  { label: 'Real-time sync', value: 'Firestore onSnapshot listeners', icon: ArrowPathIcon, bg: 'bg-orange-100 dark:bg-orange-900/30', color: 'text-orange-600' },
]

const features = [
  {
    title: 'Kanban tabule s drag & drop',
    desc: 'Přehledná tabule se sloupci Backlog, Připraveno, Probíhá a Hotovo. Úkoly lze přetahovat myší mezi sloupci.',
    icon: RectangleGroupIcon,
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    color: 'text-blue-600'
  },
  {
    title: 'Správa sprintů',
    desc: 'Organizujte práci do časově ohraničených sprintů. Každý sprint má datum zahájení, ukončení a sadu úkolů.',
    icon: CalendarDaysIcon,
    bg: 'bg-green-100 dark:bg-green-900/30',
    color: 'text-green-600'
  },
  {
    title: 'Velocity a Burndown grafy',
    desc: 'Vizualizace výkonnosti týmu. Velocity ukazuje dokončené story pointy per sprint, Burndown sleduje průběh aktuálního sprintu.',
    icon: ChartBarIcon,
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    color: 'text-orange-600'
  },
  {
    title: 'Týmová spolupráce',
    desc: 'Role Vlastník / Admin / Člen s různými oprávněními. Pozvání emailem s HMAC podepsaným odkazem.',
    icon: UserGroupIcon,
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    color: 'text-purple-600'
  },
  {
    title: 'Real-time synchronizace',
    desc: 'Změny jsou viditelné všem členům okamžitě bez nutnosti obnovovat stránku. Poháněno Firebase Firestore onSnapshot.',
    icon: ArrowPathIcon,
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    color: 'text-teal-600'
  },
  {
    title: 'Sledování času',
    desc: 'Vestavěný timer pro měření času stráveného na projektu. Každý člen má vlastní záznamy, přehled na stránce Aktivita.',
    icon: ClockIcon,
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    color: 'text-pink-600'
  },
  {
    title: 'Přílohy a komentáře',
    desc: 'K úkolům lze přikládat soubory (Firebase Storage) a diskutovat v komentářích s uvedením autora a času.',
    icon: PaperClipIcon,
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    color: 'text-yellow-600'
  },
  {
    title: 'Štítky a priority',
    desc: 'Kategorizujte úkoly barevnými štítky (Bug, Feature, Dokumentace…) a nastavujte priority (Nízká, Střední, Vysoká, Kritická).',
    icon: TagIcon,
    bg: 'bg-red-100 dark:bg-red-900/30',
    color: 'text-red-600'
  },
]

const techStack = [
  { emoji: '💚', name: 'Nuxt 3', role: 'Framework' },
  { emoji: '💙', name: 'Vue 3', role: 'UI Framework' },
  { emoji: '🔥', name: 'Firebase', role: 'Backend / DB' },
  { emoji: '🔷', name: 'TypeScript', role: 'Typový systém' },
  { emoji: '🎨', name: 'Nuxt UI', role: 'Komponenty' },
  { emoji: '🌬️', name: 'Tailwind CSS', role: 'Stylování' },
  { emoji: '📧', name: 'Resend', role: 'Email service' },
  { emoji: '▲', name: 'Vercel', role: 'Deployment' },
]

const howItWorks = [
  {
    title: 'Registrace a přihlášení',
    desc: 'Uživatel se zaregistruje emailem nebo přihlásí přes Google OAuth. Firebase Authentication spravuje session a bezpečnost.',
    bg: 'bg-blue-500'
  },
  {
    title: 'Vytvoření projektu',
    desc: 'Vlastník vytvoří projekt a pozve členy emailem. Každý člen dostane roli (Admin nebo Člen) s odpovídajícími oprávněními.',
    bg: 'bg-green-500'
  },
  {
    title: 'Organizace úkolů',
    desc: 'Úkoly se vytváří v Backlogu a přiřazují do sprintů. Na Kanban tabuli je lze přetahovat mezi stavy a sledovat postup.',
    bg: 'bg-orange-500'
  },
  {
    title: 'Real-time spolupráce',
    desc: 'Všechny změny se synchronizují v reálném čase přes Firestore onSnapshot listenery. Tým vždy vidí aktuální stav.',
    bg: 'bg-purple-500'
  },
  {
    title: 'Sledování výkonu',
    desc: 'Po každém sprintu se aktualizují reporty. Velocity a Burndown grafy pomáhají plánovat budoucí sprinty.',
    bg: 'bg-teal-500'
  },
]

const comparisonRows = [
  { feature: 'Kanban tabule', us: true, trello: true, jira: true },
  { feature: 'Správa sprintů', us: true, trello: false, jira: true },
  { feature: 'Burndown graf', us: true, trello: false, jira: true },
  { feature: 'Velocity graf', us: true, trello: false, jira: true },
  { feature: 'Real-time sync', us: true, trello: true, jira: true },
  { feature: 'Pozvání emailem', us: true, trello: true, jira: true },
  { feature: 'Sledování času', us: true, trello: false, jira: 'placená verze' },
  { feature: 'Story pointy', us: true, trello: 'plugin', jira: true },
  { feature: 'Štítky / Labels', us: true, trello: true, jira: true },
  { feature: 'Přílohy souborů', us: true, trello: true, jira: true },
  { feature: 'Offline podpora', us: false, trello: false, jira: false },
  { feature: 'Zdarma pro týmy', us: true, trello: 'omezeno', jira: 'omezeno' },
]
</script>

<style scoped>
.about-page {
  padding-bottom: 4rem;
}
</style>
