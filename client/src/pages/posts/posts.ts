import { V1Service } from '../../providers/apiClient/api/v1.service';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ModalController, AlertController } from 'ionic-angular';
import { PostsArray, Post, User } from "../../providers/apiClient/index";
import { PostModal } from "../../components/post-modal/post-modal";
import { TranslateService } from "@ngx-translate/core";

/**
 * Generated class for the Posts page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */
@IonicPage()
@Component({
	selector: 'page-posts',
	templateUrl: 'posts.html',
})
export class PostsPage {

	user: User
	posts: PostsArray

	constructor(
		public navCtrl: NavController, public navParams: NavParams,
		public api: V1Service, public modCtrl: ModalController,
		private alertCtrl: AlertController, private tr: TranslateService
	) {
		api.getV1ClientPosts().subscribe((data) => {
			this.posts = data.posts
		}, (err) => {
			console.error(err)
		})
		this.user = this.navParams.data
	}

	createPost() {
		let modal = this.modCtrl.create(PostModal, null, { showBackdrop: false, enableBackdropDismiss: false })
		modal.onDidDismiss((post) => {
			if (post) {
				this.posts.splice(0, 0, post)
			}
		})
		modal.present()
	}

	deletePost(deletedPost: Post) {
		let alert = this.alertCtrl.create({
			title: this.tr.instant('p.modal.delete.title'),
			message: this.tr.instant('p.modal.delete.message'),
			buttons: [
				{
					text: this.tr.instant('global.yes'),
					handler: () => {
						this.api.deleteV1ClientPostsTimestamp(deletedPost.creationTs).subscribe(() => {
							console.log(this.posts)
							this.posts = this.posts.filter((post) => {
								return post.creationTs != deletedPost.creationTs
							})
						}, (err) => {
							console.error(err)
						})
					}
				},
				{
					text: this.tr.instant('global.no'),
					role: 'cancel'
				}
			]
		})
		alert.present()
	}

}