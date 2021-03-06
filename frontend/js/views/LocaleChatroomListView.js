define([
	'jquery',
	'thorax',
	'bootstrapjs',
	'LocaleChatroomView',
	'LocaleChatWindowView',
	'LocaleChatroomCollection',
	'LocaleSocket',
	'LocaleAuth',
	'hbs!templates/LocaleListView'
], function($, Thorax, Bootstrap, LocaleChatroomView, LocaleChatWindowView, LocaleChatroomCollection, LocaleSocket, LocaleAuth, ListTemplate){

	var LocaleChatroomListView = Thorax.CollectionView.extend({
		el: '#my-rooms',

		events: {
			'click #add-locale' : 'createLocale',
			'helper:collection': 'ChatWindowHelperCreated'
		},

		name: "ListView",

		collection: new LocaleChatroomCollection(),

		chatWindowCollection: new LocaleChatroomCollection(),

		initialize: function() {

			this.$el.on('click', '.btn-locale-privacy', function() {

				if(!$(this).hasClass('active')) {
					$('.btn-locale-privacy').removeClass('active');
					$(this).toggleClass('active');
				}
			});
		},

		template: ListTemplate,

		itemView: function(item) {
			return new LocaleChatroomView( {model: item.model});
		},

		itemContext: function(model, i) {
			return model.attributes;
		},

		itemFilter: function(model, index) {
			return model.get("canJoin") === true;
		},

		ChatWindowViewFactory: function(item) {
			return new LocaleChatWindowView({ model: item.model });
		},

		ChatWindowFilter: function(model, index) {
			return model.get("joined") === true;
		},

		ChatWindowHelperCreated: function(collection, view) {
			this.helper = view;
		},

		add: function(room) {
			this.collection.add(room);
			this.chatWindowCollection.add(room);
		},

		deleteRoom: function(room) {
			this.collection.remove(room);
			this.chatWindowCollection.remove(room);
			this.parent.removeMarker(room.get("name"));
		},

		getRooms: function() {
			// this.children also containers the helper view for the window views
			// we omit that and other children which don't have a model, meaning its not a valid ChatroomView
			return _.omit(this.children, function(value) { return value.model === undefined; });
		},

		getWindows: function() {
			return this.helper.children;
		},

		createLocale: function() {

			var privacyMode = this.$el.find('button.btn-locale-privacy.active').data("privacy");

			$("#add-room-dialog").stop().animate({height: "0"}, function(){
				$("#add-room-dialog").css("display", "none");
				$('#form-dialog-btn').removeClass('active');
			})
			
			var name = this.$el.find("#roomName").val();
			var description = this.$el.find("#roomDescription").val();
			var tags = this.$el.find("#roomTags").val().split(" ").join("");
			tags = tags.split("#");
			tags.splice(0,1);

			var range = Math.min(Math.max(this.$el.find("#roomRange").val(), 100), 2000);

			if(name === undefined || description === "")
				return;

			if(tags.length == 0){
				LocaleSocket.Emit('addroom', {
					"name": name,
					"description" : description,
					"privacy": privacyMode,
					"tags": [],
					"range": range
				});
			} else {
				LocaleSocket.Emit('addroom', {
					"name": name,
					"description" : description,
					"tags" : tags,
					"privacy": privacyMode,
					"range": range
				});
			}

			this.$el.find("#roomName").val("");
			this.$el.find("#roomDescription").val("");
		}
	});

	return LocaleChatroomListView;
});