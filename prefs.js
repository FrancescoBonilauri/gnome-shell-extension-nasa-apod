
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const GdkPixbuf = imports.gi.GdkPixbuf;


let settings;

function init() {
    settings = Utils.getSettings(Me);
}

function buildCacheFlowBoxChild(title, path) {
    let buildable = new Gtk.Builder();
    buildable.add_objects_from_file(Me.dir.get_path() + '/Settings.ui', ["cache_flowchild"]);
    let row = buildable.get_object("cache_flowchild");
    let event = buildable.get_object("event");
    let label = buildable.get_object("label");
    let image = buildable.get_object("image");
    event.connect('button-press-event', function(widget, event) {
        Utils.setBackgroundBasedOnSettings(path, settings);
    });
    let stream = Gio.file_new_for_path(path).read(null);
    GdkPixbuf.Pixbuf.new_from_stream_at_scale_async(stream, 200, 200, true, null, function(source, res) {
        let pix = GdkPixbuf.Pixbuf.new_from_stream_finish(res);
        image.set_from_pixbuf(pix);
    });
    label.set_text(title);
    return row;
}

function buildPrefsWidget(){

    // Prepare labels and controls
    let buildable = new Gtk.Builder();
    buildable.add_objects_from_file(Me.dir.get_path() + '/Settings.ui', ['prefs_widget']);
    let box = buildable.get_object('prefs_widget');

    buildable.get_object('extension_version').set_text(Me.metadata.version.toString());

    let hideSwitch = buildable.get_object('hide');
    let notifySwitch = buildable.get_object('notifications');
    let transientSwitch = buildable.get_object('transient_notifications');
    let bgSwitch = buildable.get_object('background');
    let lsSwitch = buildable.get_object('lock_screen');
    let fileChooser = buildable.get_object('download_folder');
    let apiEntry = buildable.get_object('api_key');
    let cacheFlowBox = buildable.get_object('cache_flowbox');
    let cacheScroll = buildable.get_object('cache_scroll');

    // Indicator
    settings.bind('hide', hideSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

    // Notifications
    settings.bind('notify', notifySwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('transient', transientSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

    transientSwitch.set_sensitive(settings.get_boolean('notify'));
    settings.connect('changed::notify', function() {
        transientSwitch.set_sensitive(settings.get_boolean('notify'));
    });

    settings.bind('set-background', bgSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('set-lock-screen', lsSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

    //download folder
    fileChooser.set_filename(settings.get_string('download-folder'));
    fileChooser.add_shortcut_folder_uri("file://" + GLib.get_user_cache_dir() + "/apod");
    fileChooser.connect('file-set', function(widget) {
        settings.set_string('download-folder', widget.get_filename());
    });

    //API key
    settings.bind('api-key', apiEntry, 'text', Gio.SettingsBindFlags.DEFAULT);
    settings.connect('changed::api-key', function() {
        if (settings.get_string('api-key') == "")
            settings.reset('api-key');
    });

    let downloadFolder = settings.get_string('download-folder');
    let dir = Gio.file_new_for_path(downloadFolder);
    let files_iter = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
    let file_names = [], file;
    while ((file = files_iter.next_file(null)) != null) {
        file_names.push(file.get_name());
    }
    file_names.sort();

    function load_files_thumbnails() {
        let file, i = 0;
        while ((file = file_names.pop()) != null && i < 10) {
            try {
                let path = downloadFolder + "/" + file;
                let split = file.split('-');
                let date = split.splice(0, 3).join('-');
                split = split.join('-').split('.');
                split.pop();  // drop the extension
                let title = split.join('-');
                Utils.log("Loading: " + path);
                let child = buildCacheFlowBoxChild(title, path);
                cacheFlowBox.add(child);
            } catch (err) {
                Utils.log(err.message);
            } finally {
                i++;
            }
        };
    };

    load_files_thumbnails();

    cacheScroll.connect('edge-reached', function(window, pos) {
        if (pos == 3) {  // if user reached the bottom of the SrolledWindow
            load_files_thumbnails();
        }
    });

    box.show_all();

    return box;
};
