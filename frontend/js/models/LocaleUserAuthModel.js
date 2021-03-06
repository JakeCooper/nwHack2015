define([
	'thorax'
], function(){

	/**
	  * @extends Thorax.Model
	  */
	var LocaleUserAuthModel = Thorax.Model.extend({

		initialize: function() {

		},

		// Default values if they aren't provided during initialization of the object
		defaults: {
			id: undefined,
			location: undefined,
			firstName: "John",
			lastName: "Doe",
			profileUrl: undefined,
			email: ""
		}
	});

	/**
	  * Returns the object containing our extended Model
	  * @return
	  */
	return LocaleUserAuthModel;
});