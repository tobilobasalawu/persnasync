interface UserProfile {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  age: number;
  gender: string;
  location?: string;
  bio?: string;
  personalityGoals?: string[];
  profileVisibility: 'public' | 'private';
  xp: number;
  createdAt: string;
  completedSurveys?: string[]; // Track completed survey IDs
}

export class UserSession {
  private static CURRENT_USER_KEY = 'currentUser';
  private static USER_PREFIX = 'personasync_user_';

  // Set the current logged-in user
  static setCurrentUser(username: string): void {
    localStorage.setItem(this.CURRENT_USER_KEY, username);
  }

  // Get the current logged-in user's username
  static getCurrentUsername(): string | null {
    return localStorage.getItem(this.CURRENT_USER_KEY);
  }

  // Get the current logged-in user's full profile
  static getCurrentUser(): UserProfile | null {
    const username = this.getCurrentUsername();
    if (!username) return null;

    const userKey = `${this.USER_PREFIX}${username}`;
    const userData = localStorage.getItem(userKey);
    
    if (!userData) return null;
    
    const user = JSON.parse(userData);
    // Ensure XP is initialized
    if (typeof user.xp === 'undefined') {
      user.xp = 0;
      this.saveUser(user);
    }
    return user;
  }

  // Save user data
  private static saveUser(user: UserProfile): void {
    const userKey = `${this.USER_PREFIX}${user.username}`;
    localStorage.setItem(userKey, JSON.stringify(user));
  }

  // Create new user
  static createUser(userData: Omit<UserProfile, 'xp' | 'createdAt' | 'completedSurveys'>): boolean {
    const newUser: UserProfile = {
      ...userData,
      xp: 0,
      createdAt: new Date().toISOString(),
      completedSurveys: [],
      profileVisibility: 'public'
    };

    this.saveUser(newUser);
    this.setCurrentUser(newUser.username);
    return true;
  }

  // Add XP to the current user
  static addXP(xpAmount: number): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;

    currentUser.xp = (currentUser.xp || 0) + xpAmount;
    this.saveUser(currentUser);
    return true;
  }

  // Set XP for the current user
  static setXP(xpAmount: number): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;

    currentUser.xp = xpAmount;
    this.saveUser(currentUser);
    return true;
  }

  // Complete a survey and add XP (prevents duplicate completions)
  static completeSurvey(surveyId: string, xpAmount: number): { success: boolean; alreadyCompleted: boolean; xpEarned: number } {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return { success: false, alreadyCompleted: false, xpEarned: 0 };

    // Initialize completedSurveys array if it doesn't exist
    if (!currentUser.completedSurveys) {
      currentUser.completedSurveys = [];
    }

    // Check if survey already completed
    if (currentUser.completedSurveys.includes(surveyId)) {
      return { success: true, alreadyCompleted: true, xpEarned: 0 };
    }

    // Add survey to completed list and award XP
    currentUser.completedSurveys.push(surveyId);
    currentUser.xp = (currentUser.xp || 0) + xpAmount;
    this.saveUser(currentUser);

    return { success: true, alreadyCompleted: false, xpEarned: xpAmount };
  }

  // Check if user has completed a survey
  static hasSurveyCompleted(surveyId: string): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !currentUser.completedSurveys) return false;
    return currentUser.completedSurveys.includes(surveyId);
  }

  // Logout (clear current user)
  static logout(): void {
    localStorage.removeItem(this.CURRENT_USER_KEY);
  }

  // Check if user is logged in
  static isLoggedIn(): boolean {
    return this.getCurrentUsername() !== null;
  }

  // Get user by username (for profile pages)
  static getUserByUsername(username: string): UserProfile | null {
    const userKey = `${this.USER_PREFIX}${username}`;
    const userData = localStorage.getItem(userKey);
    
    return userData ? JSON.parse(userData) : null;
  }
} 