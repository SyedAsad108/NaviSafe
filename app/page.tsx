"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { WelcomeScreen } from "@/components/welcome-screen"
import { UserInfoForm } from "@/components/user-info-form"
import { TripDetailsForm } from "@/components/trip-details-form"
import { ConfirmationScreen } from "@/components/confirmation-screen"
import { SafetyDashboard } from "@/components/safety-dashboard"
import { AuthorityDashboard } from "@/components/authority-dashboard"
import { AuthorityLogin } from "@/components/authority-login"
import { Shield } from "lucide-react"

export default function NaviSafePage() {
  const [currentStep, setCurrentStep] = useState<
    "welcome" | "userInfo" | "tripDetails" | "confirmation" | "dashboard" | "authorityLogin" | "authority"
  >("welcome")
  const [userInfo, setUserInfo] = useState<any>(null)
  const [tripDetails, setTripDetails] = useState<any>(null)
  const [isAuthorityAuthenticated, setIsAuthorityAuthenticated] = useState(false)

  // Check for existing authority authentication on mount
  useEffect(() => {
    const authorityAuth = localStorage.getItem("authorityAuth")
    setIsAuthorityAuthenticated(authorityAuth === "true")
  }, [])

  const handleGetStarted = () => {
    setCurrentStep("userInfo")
  }

  const handleUserInfoSubmit = (info: any) => {
    setUserInfo(info)
    setCurrentStep("tripDetails")
  }

  const handleTripDetailsSubmit = (details: any) => {
    setTripDetails(details)
    setCurrentStep("confirmation")
  }

  const handleBackToUserInfo = () => {
    setCurrentStep("userInfo")
  }

  const handleContinue = () => {
    setCurrentStep("dashboard")
  }

  const handleAuthorityAccess = () => {
    if (isAuthorityAuthenticated) {
      setCurrentStep("authority")
    } else {
      setCurrentStep("authorityLogin")
    }
  }

  const handleAuthorityLogin = () => {
    setIsAuthorityAuthenticated(true)
    setCurrentStep("authority")
  }

  const handleAuthorityLogout = () => {
    localStorage.removeItem("authorityAuth")
    setIsAuthorityAuthenticated(false)
    setCurrentStep("welcome")
  }

  const handleBackToTourist = () => {
    setCurrentStep("welcome")
  }

  const handleBackFromAuthorityLogin = () => {
    setCurrentStep("welcome")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Authority Access Button - Always visible except on authority screens */}
      {currentStep !== "authority" && currentStep !== "authorityLogin" && (
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAuthorityAccess}
            className="bg-background/80 backdrop-blur-sm hover:scale-110 hover:shadow-lg transition-all duration-300 animate-pulse border-primary/50 hover:border-primary group"
          >
            <Shield className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
            Authority Dashboard
          </Button>
        </div>
      )}

      {currentStep === "welcome" && <WelcomeScreen onGetStarted={handleGetStarted} />}
      {currentStep === "userInfo" && <UserInfoForm onSubmit={handleUserInfoSubmit} />}
      {currentStep === "tripDetails" && (
        <TripDetailsForm onSubmit={handleTripDetailsSubmit} onBack={handleBackToUserInfo} />
      )}
      {currentStep === "confirmation" && (
        <ConfirmationScreen onContinue={handleContinue} userInfo={userInfo} tripDetails={tripDetails} />
      )}
      {currentStep === "dashboard" && <SafetyDashboard userInfo={userInfo} tripDetails={tripDetails} />}
      {currentStep === "authorityLogin" && (
        <AuthorityLogin onLogin={handleAuthorityLogin} onBack={handleBackFromAuthorityLogin} />
      )}
      {currentStep === "authority" && (
        <AuthorityDashboard onBack={handleBackToTourist} onLogout={handleAuthorityLogout} />
      )}
    </div>
  )
}
