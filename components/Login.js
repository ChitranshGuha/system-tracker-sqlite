import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginForm({ onLogin, VALID_USERS }) {
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})

  const validateForm = () => {
    const newErrors = {}

    if (!mobile) {
      newErrors.mobile = "Mobile number can't be empty"
    } else if (mobile.length !== 10) {
      newErrors.mobile = "Mobile number should be 10 digits"
    }

    if (!password) {
      newErrors.password = "Password can't be empty"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (validateForm()) {
      const user = VALID_USERS.find(u => u.mobile === mobile && u.password === password)
      if (user) {
        localStorage.setItem('userMobile', user.mobile)
        onLogin(user)
      } else {
        setErrors({ 
          form: "Invalid credentials",
          mobile: 'Please enter a valid mobile number', 
          password: 'Please enter a valid password'
        })
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg">
        <div className="p-6 sm:p-8">
          <div className="text-center">
            <img
              src="/assets/images/icon.png"
              alt="Activity Logger Logo"
              width={20}
              height={20}
              className="mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Login to Activity Logger</h2>
          </div>
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number
              </label>
              <input
                id="mobile"
                type="tel"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value)
                  setErrors({...errors, form: "", mobile: ""})
                }}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.mobile ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-black`}
                placeholder="Enter 10 digit mobile number"
                maxLength={10}
              />
              <p className={`${errors.mobile ? "text-red-500" : "text-gray-400"} text-xs mt-1`}>
                {errors.mobile || "Please enter a valid 10 digit mobile number"}
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setErrors({...errors, form: "", password: ""})
                  }}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-black pr-10`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              <p className={`${errors.password ? "text-red-500" : "text-gray-400"} text-xs mt-1`}>
                {errors.password || "Please enter your password"}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-black hover:text-gray-700">
                  Forgot your password?
                </a>
              </div>
            </div>

            {errors.form && <p className="text-red-500 text-sm">{errors.form}</p>}

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
              Sign in
            </button>
          </form>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 sm:px-8">
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <a href="#" className="font-medium text-black hover:text-gray-700">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}