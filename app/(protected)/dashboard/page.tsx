"use client"

import "../../styles/dashboard.css"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

import {
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline"

import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js"

import SubscribeButton from "../../components/SubscribeButton"

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
)

type Profile = {
  id: string
  user_id: string
  full_name: string | null
  company_name: string | null
  subscription_status: string | null
  trial_start: string | null
  trial_end: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

type SubscriptionView = {
  status: string | null
  trial_end: string | null
}

type StatsState = {
  customers: number
  agreements: number
  activeAgreements: number
  expiringSoon: number
  customersWithoutActive: number
}

type ChartDataState = {
  labels: string[]
  datasets: any[]
}

export default function Page() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionView | null>(null)

  const [stats, setStats] = useState<StatsState>({
    customers: 0,
    agreements: 0,
    activeAgreements: 0,
    expiringSoon: 0,
    customersWithoutActive: 0,
  })

  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [upcoming, setUpcoming] = useState<any[]>([])
  const [criticalCustomers, setCriticalCustomers] = useState<any[]>([])

  const [graphType, setGraphType] = useState<
    "agreements" | "customers" | "activity" | "archived"
  >("agreements")

  const [chartData, setChartData] = useState<ChartDataState>({
    labels: [],
    datasets: [],
  })

  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)

  function daysLeft(dateString: string | null) {
    if (!dateString) return null
    const end = new Date(dateString)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // -----------------------------
  // SESSION READY
  // -----------------------------
  useEffect(() => {
    async function waitForSession() {
      const { data } = await supabase.auth.getSession()
      if (data?.session) {
        setSessionReady(true)
        return
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) setSessionReady(true)
      })

      return () => subscription.unsubscribe()
    }

    waitForSession()
  }, [])

  // -----------------------------
  // PROFILE + SUBSCRIPTION
  // -----------------------------
  useEffect(() => {
    if (!sessionReady) return

    async function loadProfile() {
      setIsLoadingProfile(true)

      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        setProfile(null)
        setSubscription(null)
        setIsLoadingProfile(false)
        return
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userData.user.id)
        .single<Profile>()

      if (!profileData) {
        setProfile(null)
        setSubscription(null)
        setIsLoadingProfile(false)
        return
      }

      setProfile(profileData)
      setSubscription({
        status: profileData.subscription_status,
        trial_end: profileData.trial_end,
      })

      setIsLoadingProfile(false)
    }

    loadProfile()
  }, [sessionReady])

  // -----------------------------
  // DASHBOARD DATA
  // -----------------------------
  useEffect(() => {
    if (!sessionReady) return

    fetchStats()
    fetchRecentActivity()
    fetchUpcoming()
    fetchCriticalCustomers()
  }, [sessionReady])

  useEffect(() => {
    if (!sessionReady) return
    fetchGraphData()
  }, [graphType, sessionReady])

  // -----------------------------
  // FETCH FUNCTIONS
  // -----------------------------
  async function fetchStats() {
    const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id")

  console.log("CUSTOMERS ERROR:", customersError)
  console.log("CUSTOMERS DATA:", customers)

  const { data: agreements, error: agreementsError } = await supabase
    .from("agreements")
    .select("*")

  console.log("AGREEMENTS ERROR:", agreementsError)
  console.log("AGREEMENTS DATA:", agreements)

    const customerCount = customers?.length || 0
    const agreementCount = agreements?.length || 0
    const active = agreements?.filter((a: any) => !a.archived).length || 0

    const today = new Date()
    const in30Days = new Date()
    in30Days.setDate(today.getDate() + 30)

    const todayStr = today.toISOString().split("T")[0]
    const in30DaysStr = in30Days.toISOString().split("T")[0]

    const soon =
      agreements?.filter(
        (a: any) => a.end_date >= todayStr && a.end_date <= in30DaysStr
      ).length || 0

    const customersWithActive = new Set(
      agreements?.filter((a: any) => !a.archived).map((a: any) => a.customer_id)
    )

    const customersWithoutActive =
      customers?.filter((c: any) => !customersWithActive.has(c.id)).length || 0

    setStats({
      customers: customerCount,
      agreements: agreementCount,
      activeAgreements: active,
      expiringSoon: soon,
      customersWithoutActive,
    })
  }

  async function fetchRecentActivity() {
    const { data: notes } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)

    setRecentActivity(notes || [])
  }

  async function fetchUpcoming() {
    const today = new Date().toISOString().split("T")[0]

    const { data } = await supabase
      .from("agreements")
      .select("*")
      .gt("end_date", today)
      .order("end_date", { ascending: true })
      .limit(5)

    setUpcoming(data || [])
  }

  async function fetchCriticalCustomers() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) return

    const { data: customers } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", userData.user.id)

    const { data: agreements } = await supabase
      .from("agreements")
      .select("customer_id, archived, end_date")

    if (!customers || !agreements) {
      setCriticalCustomers([])
      return
    }

    const enriched = customers.map((c: any) => {
      const customerAgreements = agreements.filter(
        (a: any) => a.customer_id === c.id
      )

      if (customerAgreements.length === 0) {
        return {
          ...c,
          hasNeverHadAgreement: true,
          hasActiveAgreement: false,
          lastAgreementEnd: null,
          daysSinceEnd: null,
        }
      }

      const hasActive = customerAgreements.some((a: any) => !a.archived)

      const ended = customerAgreements
        .filter((a: any) => a.archived)
        .sort((a: any, b: any) => (a.end_date > b.end_date ? -1 : 1))

      if (ended.length === 0) {
        return {
          ...c,
          hasNeverHadAgreement: true,
          hasActiveAgreement: hasActive,
          lastAgreementEnd: null,
          daysSinceEnd: null,
        }
      }

      const lastEnd = ended[0].end_date
      const days = Math.ceil(
        (new Date().getTime() - new Date(lastEnd).getTime()) /
          (1000 * 60 * 60 * 24)
      )

      return {
        ...c,
        hasNeverHadAgreement: false,
        hasActiveAgreement: hasActive,
        lastAgreementEnd: lastEnd,
        daysSinceEnd: days,
      }
    })

    let withoutActive = enriched.filter((c: any) => !c.hasActiveAgreement)

    withoutActive = withoutActive.sort((a: any, b: any) => {
      if (a.hasNeverHadAgreement && !b.hasNeverHadAgreement) return -1
      if (!a.hasNeverHadAgreement && b.hasNeverHadAgreement) return 1

      if (a.daysSinceEnd == null) return 1
      if (b.daysSinceEnd == null) return -1

      return a.daysSinceEnd - b.daysSinceEnd
    })

    setCriticalCustomers(withoutActive.slice(0, 3))
  }

  async function fetchGraphData() {
    let data: any[] = []

    if (graphType === "agreements") {
      const { data: agreements } = await supabase
        .from("agreements")
        .select("start_date")
      data = agreements || []
    }

    if (graphType === "customers") {
      const { data: customers } = await supabase
        .from("customers")
        .select("created_at")
      data = customers || []
    }

    if (graphType === "activity") {
      const { data: notes } = await supabase.from("notes").select("created_at")
      data = notes || []
    }

    if (graphType === "archived") {
      const { data: agreements } = await supabase
        .from("agreements")
        .select("archived, start_date")
      data = agreements?.filter((a: any) => a.archived) || []
    }

    const counts: Record<string, number> = {}

    data.forEach((item: any) => {
      const date =
        item.start_date || item.created_at || item.end_date

      if (!date) return

      const month = new Date(date).toLocaleString("no-NO", {
        month: "short",
        year: "numeric",
      })

      counts[month] = (counts[month] || 0) + 1
    })

    const labels = Object.keys(counts)
    const values = Object.values(counts)

    setChartData({
      labels,
      datasets: [
        {
          label: "Antall",
          data: values,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.2)",
          borderWidth: 2,
          tension: 0.3,
        },
      ],
    })
  }

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div className="p-8 space-y-10">
      {/* Subscription Section */}
      {sessionReady && !isLoadingProfile && subscription && (
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 font-medium">
                {profile?.company_name}
              </p>

              <h2 className="text-2xl font-bold mt-1">
                {subscription.status === "active" && "Aktivt abonnement"}
                {subscription.status === "trialing" && "Prøveperiode aktiv"}
                {subscription.status === "past_due" && "Betaling feilet"}
                {subscription.status === "canceled" && "Abonnement avsluttet"}
                {subscription.status === "incomplete" &&
                  "Betaling ikke fullført"}
                {subscription.status === "unpaid" && "Abonnement ubetalt"}
              </h2>

              {subscription.status === "trialing" && (
                <p className="text-gray-600 mt-1">
                  {daysLeft(subscription.trial_end)} dager igjen av
                  prøveperioden
                </p>
              )}

              {subscription.status === "active" && (
                <p className="text-gray-600 mt-1">
                  Abonnementet ditt er aktivt
                </p>
              )}

              {subscription.status === "past_due" && (
                <p className="text-gray-600 mt-1">
                  Betalingen feilet – oppdater betalingsmetode
                </p>
              )}

              {subscription.status === "canceled" && (
                <p className="text-gray-600 mt-1">
                  Abonnementet er avsluttet – aktiver på nytt
                </p>
              )}

              {(subscription.status === "incomplete" ||
                subscription.status === "unpaid") && (
                <p className="text-gray-600 mt-1">
                  Betalingen ble ikke fullført – fullfør kjøpet
                </p>
              )}
            </div>

            <div>
              {subscription.status === "trialing" && (
                <SubscribeButton
                  label="Start abonnement"
                  mode="checkout"
                />
              )}

              {subscription.status === "active" && (
                <SubscribeButton
                  label="Administrer abonnement"
                  mode="portal"
                />
              )}

              {subscription.status === "past_due" && (
                <SubscribeButton
                  label="Oppdater betalingsmetode"
                  mode="portal"
                />
              )}

              {subscription.status === "canceled" && (
                <SubscribeButton
                  label="Start abonnement på nytt"
                  mode="checkout"
                />
              )}

              {(subscription.status === "incomplete" ||
                subscription.status === "unpaid") && (
                <SubscribeButton
                  label="Fullfør betaling"
                  mode="checkout"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400 mb-1">Dashboard</div>
          <h1 className="text-3xl font-bold tracking-tight">Oversikt</h1>
          <p className="text-gray-600 mt-1">
            Kunder, avtaler og aktivitet samlet på ett sted
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/customers/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
          >
            Ny kunde
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link href="/customers">
          <StatCard
            title="Kunder"
            value={stats.customers}
            icon={<UserGroupIcon className="h-8 w-8 text-blue-600" />}
            color="blue"
          />
        </Link>

        <Link href="/customers?noActive=true">
          <StatCard
            title="Kunder uten avtale"
            value={stats.customersWithoutActive}
            icon={<ExclamationTriangleIcon className="h-8 w-8 text-red-600" />}
            color="yellow"
          />
        </Link>

        <Link href="/agreements?status=active">
          <StatCard
            title="Aktive avtaler"
            value={stats.activeAgreements}
            icon={<CheckCircleIcon className="h-8 w-8 text-green-600" />}
            color="green"
          />
        </Link>

        <Link href="/agreements?expiresSoon=true">
          <StatCard
            title="Utløper snart"
            value={stats.expiringSoon}
            icon={<ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />}
            color="yellow"
          />
        </Link>
      </div>

      {/* Graph Section */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Statistikk</h2>

          <div className="flex gap-2">
            {["agreements", "customers", "activity", "archived"].map((type) => (
              <button
                key={type}
                onClick={() => setGraphType(type as any)}
                className={`px-3 py-1 rounded-lg text-sm border ${
                  graphType === type
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-100 text-gray-700 border-gray-300"
                }`}
              >
                {type === "agreements" && "Avtaler"}
                {type === "customers" && "Kunder"}
                {type === "activity" && "Aktivitet"}
                {type === "archived" && "Arkiverte"}
              </button>
            ))}
          </div>
        </div>

        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Upcoming deadlines */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Kommende avtaler</h2>
        <ul className="space-y-3">
          {upcoming.length === 0 && (
            <p className="text-gray-500 text-sm">Ingen kommende avtaler</p>
          )}
          {upcoming.map((a: any) => (
            <li key={a.id} className="border rounded p-3">
              <div className="font-medium">{a.title}</div>
                            <div className="text-sm text-gray-600">
                Utløper: {a.end_date}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Critical customers */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Mest kritiske kunder</h2>

        {criticalCustomers.length === 0 && (
          <p className="text-gray-500 text-sm">Ingen kritiske kunder akkurat nå</p>
        )}

        <ul className="space-y-3">
          {criticalCustomers.map((c: any) => (
            <li
              key={c.id}
              className="border rounded p-3 flex justify-between items-center"
            >
              <div>
                <Link href={`/customers/${c.id}`}>
                  <span className="font-medium text-blue-600 cursor-pointer">
                    {c.name}
                  </span>
                </Link>

                <div className="text-sm text-gray-600">
                  {c.email || "Ingen e‑post"}
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  {c.hasNeverHadAgreement && "Aldri hatt avtale"}
                  {!c.hasNeverHadAgreement &&
                    c.daysSinceEnd != null &&
                    `Sist avtale utløp for ${c.daysSinceEnd} dager siden`}
                </div>
              </div>

              <Link
                href={`/customers/${c.id}`}
                className="text-blue-600 hover:underline text-sm"
              >
                Åpne
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Siste aktivitet</h2>
        <ul className="space-y-3">
          {recentActivity.length === 0 && (
            <p className="text-gray-500 text-sm">Ingen aktivitet registrert</p>
          )}
          {recentActivity.map((n: any) => (
            <li key={n.id} className="border rounded p-3">
              <div className="font-medium">{n.content}</div>
              <div className="text-sm text-gray-600">
                {new Date(n.created_at).toLocaleString("no-NO")}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: number
  icon: React.ReactNode
  color: string
}) {
  const bg = {
    blue: "bg-blue-50",
    indigo: "bg-indigo-50",
    green: "bg-green-50",
    yellow: "bg-yellow-50",
  }[color]

  return (
    <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${bg}`}>{icon}</div>
      </div>
      <div className="mt-4 text-gray-500 text-sm">{title}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  )
}

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1 },
    },
  },
}

