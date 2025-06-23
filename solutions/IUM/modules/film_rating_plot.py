import matplotlib.pyplot as plt
import seaborn as sns


def plot_combined_rating(df_bar, df_year_group, custom_palette, bins_anni):
    """
    Genera il grafico combinato barre sovrapposte + linea del rating medio.
    """
    # Configurazione figura
    plt.figure(figsize=(16, 8))

    # Grafico a barre
    ax = sns.histplot(
        data=df_bar,
        x='release_year',
        hue='rating_group',
        bins=len(bins_anni) - 1,
        multiple='stack',
        palette=custom_palette
    )

    # Grafico a linea (secondo asse)
    ax2 = ax.twinx()
    sns.lineplot(
        data=df_year_group,
        x='year_group_mid',
        y='rating_medio',
        color='black',
        marker='o',
        ax=ax2,
        label='Rating medio'
    )

    # Formattazione
    ax2.grid(False)
    ax2.set_yticklabels([])
    ax2.set_ylabel('')

    # Limiti con padding
    rating_min = df_year_group['rating_medio'].min()
    rating_max = df_year_group['rating_medio'].max()
    ax2.set_ylim(rating_min - 0.15, rating_max + 0.22)

    # Valori sopra i punti
    for x, y in zip(df_year_group['year_group_mid'], df_year_group['rating_medio']):
        ax2.text(x, y + 0.05, f'{y:.2f}',
                 color='black',
                 ha='center',
                 va='bottom',
                 fontsize=10)

    # Titoli/etichette
    plt.title('Numero di film, per rating, rilasciati negli anni e media del rating negli anni')
    ax.set_xlabel('Anno di rilascio')
    ax.set_ylabel('Numero di film')
    ax2.legend(loc='upper right')

    plt.show()