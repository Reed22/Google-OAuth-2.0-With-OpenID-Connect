var delete_buttons = document.getElementsByClassName('member-delete')

var hello = function() {
    alert("het");
}

for(var i = 0; i < delete_buttons.length; i++) {
    delete_buttons[i].addEventListener('click', hello, false);
}