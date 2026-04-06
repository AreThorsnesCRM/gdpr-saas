import { logout } from "./actions"

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded"
      >
        Logg ut
      </button>
    </form>
  )
}
