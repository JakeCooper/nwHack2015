define([
	'thorax'
], function(){

	/**
	  * @extends Thorax.Model
	  */
	var LocaleSearchModel = Thorax.Model.extend({

		initialize: function() {

		},

		// Default values if they aren't provided during initialization of the object
		defaults: {

		}
	});

	/**
	  * Returns the object containing our extended Model
	  * @return
	  */
	return LocaleSearchModel;
});