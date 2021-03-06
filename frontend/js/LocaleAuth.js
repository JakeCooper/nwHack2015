define([
	'jquery',
	'LocaleAuthFB',
	'LocaleAuthGPlus',
	'LocaleUserAuthModel',
	'LocaleUtilities',
	'LocaleRouter',
	'LocaleSocket'
], function($, LocaleAuthFB, LocaleAuthGPlus, LocaleUserAuthModel, LocaleUtilities, LocaleRouter, LocaleSocket){

	var View,
		UserModel,
		AuthPolicy = undefined,
		FBPolicy,
		GPlusPolicy,
		LoggedInState = false;

	var Initialize = function (AuthView) {
		View = AuthView;

		// We try to initialize social networks immediately so that we can minimize the delay
		// between a user clicking a social button and the actual login process. This is because the
		// initial social init can take a while to complete due to API calls and other factors.
		FBPolicy = new LocaleAuthFB();
		GPlusPolicy = new LocaleAuthGPlus();

		FBPolicy.Initialize();
		GPlusPolicy.Initialize();
	}

	var GetAuthState = function() {
		if(AuthPolicy !== undefined)
			return AuthPolicy.GetAuthState();
		else
			return false;
	}	

	var GetAuthToken = function() {
		return AuthPolicy.GetAuthToken();
	}

	var HandleLogin = function(response) {
		if(response.UserLoggedIn === true)
		{
			if(UserModel.get("id") !== undefined) {
				console.log("User already loaded");
				return;
			}

			// User logged in. Aquire more minerals
			AuthPolicy.GetUserData(UserModel, function(data) {
				
				if(UserModel.get("id") === undefined) {
					console.log("Error loading user data");
					return;
				}

				if(LoggedInState === true) {
					console.log("User already logged in");
					return;
				}

				// Pass data to view
				LocaleSocket.Emit('join', JSON.stringify(UserModel));
				View.loggedin();

				LoggedInState = true;
			})
		}
		else if(response.UserAuthed === true)
		{
			// user did not log in
			console.log("User entered invalid login details");
		}
		else if(response.ConnectedToPlatform === true)
		{
			// user did not authorize
			AuthPolicy.Authorize();
			console.log("User did not authorize Locale");
		}
		else
		{ 
			// user did not connect to fb at all
			console.log("Fatal login error");
		}
	}

	var Login = function() {
		// Set up defaults

		LocaleUtilities.GetCurrentLocation(function(coords) {

			if(coords === undefined) {
				console.log("Failed to get users coordinates for login");
				return;
			}

			UserModel = new LocaleUserAuthModel({
				location: { lat: coords.latitude, lon: coords.longitude }, 
				firstName: "John", lastName: "Doe", token: AuthToken, email: "email@email.com",
				profileUrl: "assets/profilepic/placeholder.png"
			});

			AuthPolicy.Login(HandleLogin);

		});
	}

	var LoginFacebook = function() {
		AuthPolicy = FBPolicy;

		Login();
	}

	var LoginGooglePlus = function() {
		AuthPolicy = GPlusPolicy;

		Login();
	}


	var Logout = function() {
		// Pfft you think you can logout?
	}

	var EnsureAuthed = function() {
		if(GetAuthState() === false)
		{
			// View should move back to login page
			View.redirectToLogin();
		}
	}

	var GetUserModel = function() {
		return UserModel;
	}

	var GetPlatformData = function() {
		return AuthPolicy.GetPlatformData();
	}

	var GetProfilePicture = function(callback) {
		AuthPolicy.LoadProfilePicture(UserModel, function(model) {

			callback(model);
		});
	}
	
	// Map public API functions to internal functions
	return {
		Initialize: Initialize,
		GetAuthState: GetAuthState,
		GetAuthToken: GetAuthToken,
		LoginFacebook: LoginFacebook,
		LoginGooglePlus: LoginGooglePlus,
		Logout: Logout,
		EnsureAuthed: EnsureAuthed,
		GetUserModel: GetUserModel,
		GetPlatformData: GetPlatformData,
		GetProfilePicture: GetProfilePicture
	};
});