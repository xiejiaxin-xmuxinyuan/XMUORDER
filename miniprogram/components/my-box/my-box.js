// components/my-box/my-box.js
Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    title: {
      type: String
    }
  },
  methods: {
    _none: () => {},
    _hideBox: function (e) {
      this.triggerEvent('hideBox', {
        "hideBox": true
      })
    }
  }
})